use std::path::Path;
use std::process::Stdio;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::models::{JobEvent, JobStart};
use crate::state::DesktopState;

const JOB_EVENT: &str = "asg://job";
const COMMANDS: &[&str] = &[
    "status",
    "search",
    "fetch",
    "start",
    "stop",
    "restart",
    "logs",
    "config",
    "engines",
    "plugins",
    "extensions",
    "browser",
    "adlist",
    "update",
    "doctor",
];

fn emit_job(app: &AppHandle, event: JobEvent) {
    let _ = app.emit(JOB_EVENT, event);
}

fn is_mutating(args: &[String]) -> bool {
    let command = args.first().map(String::as_str).unwrap_or_default();
    let subcommand = args.get(1).map(String::as_str).unwrap_or_default();
    match command {
        "start" | "stop" | "restart" | "adlist" => true,
        "config" => subcommand == "set",
        "engines" => matches!(subcommand, "enable" | "disable" | "route" | "secret"),
        "plugins" => matches!(subcommand, "install" | "remove"),
        "extensions" => {
            matches!(subcommand, "install" | "remove" | "secret")
                || (subcommand == "config"
                    && args
                        .iter()
                        .any(|arg| arg == "--set" || arg == "--unset" || arg == "--file"))
                || (subcommand == "setup" && !args.iter().any(|arg| arg == "--status"))
        }
        "browser" => subcommand == "install",
        "update" => subcommand == "apply",
        _ => false,
    }
}

fn is_cancellable(args: &[String]) -> bool {
    let command = args.first().map(String::as_str).unwrap_or_default();
    let subcommand = args.get(1).map(String::as_str).unwrap_or_default();
    match command {
        "search" | "fetch" => true,
        "logs" => args.iter().any(|arg| arg == "-f" || arg == "--follow"),
        "update" => subcommand == "apply",
        "browser" => subcommand == "install",
        _ => false,
    }
}

fn parse_stdout_line(line: &str) -> (String, Value) {
    if let Ok(value) = serde_json::from_str::<Value>(line) {
        let is_event = value.get("type").and_then(Value::as_str) == Some("event");
        let is_result = value.get("schema_version").and_then(Value::as_i64) == Some(1)
            && value.get("command").and_then(Value::as_str).is_some();
        if is_event {
            return ("stdout".to_string(), value);
        }
        if is_result {
            return ("result".to_string(), value);
        }
        return ("stdout".to_string(), value);
    }
    ("stdout".to_string(), Value::String(line.to_string()))
}

#[cfg(unix)]
fn terminate_process(pid: u32) {
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
}

#[cfg(windows)]
fn terminate_process(pid: u32) {
    let pid_text = pid.to_string();
    let _ = std::process::Command::new("taskkill")
        .args(["/PID", pid_text.as_str(), "/T"])
        .creation_flags(0x08000000)
        .status();
}

async fn reader_loop<R>(
    app: AppHandle,
    job_id: String,
    reader: R,
    stream: &'static str,
    sender: mpsc::UnboundedSender<(String, Value)>,
) where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let mut lines = BufReader::new(reader).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        let (kind, data) = if stream == "stdout" {
            parse_stdout_line(&line)
        } else {
            ("stderr".to_string(), Value::String(line))
        };
        emit_job(
            &app,
            JobEvent {
                job_id: job_id.clone(),
                kind,
                data: Some(data.clone()),
            },
        );
        let _ = sender.send((stream.to_string(), data));
    }
}

#[tauri::command]
pub async fn run_cli(
    app: AppHandle,
    state: State<'_, DesktopState>,
    args: Vec<String>,
    stdin: Option<String>,
    mode: String,
) -> Result<JobStart, String> {
    let root = state
        .root()
        .ok_or_else(|| "尚未选择 ASG 安装目录。".to_string())?;
    let validation = crate::config::validate_root(&root);
    if !validation.valid {
        return Err(validation
            .reason
            .unwrap_or_else(|| "ASG 安装目录无效。".to_string()));
    }
    let node = Path::new(
        validation
            .node_path
            .as_deref()
            .ok_or_else(|| "未找到可用的 Node 可执行文件。".to_string())?,
    );
    let command_name = args
        .first()
        .ok_or_else(|| "CLI 参数不能为空。".to_string())?;
    if command_name == "serve" || !COMMANDS.contains(&command_name.as_str()) {
        return Err(format!("GUI 不允许执行该 CLI 命令：{command_name}"));
    }
    if mode != "json" && mode != "jsonl" {
        return Err("CLI 输出模式必须是 json 或 jsonl。".to_string());
    }

    let mutating = is_mutating(&args);
    let job_id = uuid::Uuid::new_v4().to_string();
    if mutating {
        let mut write_job = state.write_job.lock().await;
        if let Some(active) = write_job.as_ref() {
            return Err(format!("已有写操作正在执行（任务 {active}）。"));
        }
        *write_job = Some(job_id.clone());
    }

    let (cancel_sender, cancel_receiver) = tokio::sync::oneshot::channel();
    let cancellable = is_cancellable(&args);
    if cancellable {
        state
            .jobs
            .lock()
            .await
            .insert(job_id.clone(), cancel_sender);
    }

    let script = root.join("bin").join("asg.mjs");
    let mut command = Command::new(node);
    command
        .arg(&script)
        .arg(format!("--{mode}"))
        .args(&args)
        .current_dir(&root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            if mutating {
                *state.write_job.lock().await = None;
            }
            if cancellable {
                state.jobs.lock().await.remove(&job_id);
            }
            return Err(format!("无法启动 ASG CLI：{error}"));
        }
    };
    let pid = child.id().unwrap_or_default();

    if let Some(text) = stdin {
        if let Some(mut input) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            if let Err(error) = input.write_all(text.as_bytes()).await {
                let _ = child.kill().await;
                if mutating {
                    *state.write_job.lock().await = None;
                }
                state.jobs.lock().await.remove(&job_id);
                return Err(format!("无法写入 CLI stdin：{error}"));
            }
        }
    } else {
        drop(child.stdin.take());
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 CLI stdout。".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法读取 CLI stderr。".to_string())?;

    let state_for_task = state.inner().clone();
    let app_for_task = app.clone();
    let job_for_task = job_id.clone();
    let cancellable_for_task = cancellable;
    emit_job(
        &app,
        JobEvent {
            job_id: job_id.clone(),
            kind: "started".to_string(),
            data: None,
        },
    );

    tauri::async_runtime::spawn(async move {
        let (sender, mut receiver) = mpsc::unbounded_channel();
        let stdout_task = tokio::spawn(reader_loop(
            app_for_task.clone(),
            job_for_task.clone(),
            stdout,
            "stdout",
            sender.clone(),
        ));
        let stderr_task = tokio::spawn(reader_loop(
            app_for_task.clone(),
            job_for_task.clone(),
            stderr,
            "stderr",
            sender,
        ));

        let mut cancelled = false;
        let mut exit_code = None;
        let cancel_future = async move {
            if cancellable_for_task {
                let _ = cancel_receiver.await;
            } else {
                std::future::pending::<()>().await;
            }
        };
        tokio::pin!(cancel_future);
        loop {
            tokio::select! {
                Some((_stream, _data)) = receiver.recv() => {}
                _ = &mut cancel_future => {
                    cancelled = true;
                    if pid > 0 {
                        terminate_process(pid);
                    }
                    break;
                }
                status = child.wait() => {
                    exit_code = status.ok().and_then(|status| status.code());
                    break;
                }
            }
        }

        let status = if cancelled {
            emit_job(
                &app_for_task,
                JobEvent {
                    job_id: job_for_task.clone(),
                    kind: "cancelled".to_string(),
                    data: None,
                },
            );
            match tokio::time::timeout(std::time::Duration::from_secs(6), child.wait()).await {
                Ok(result) => result.ok(),
                Err(_) => {
                    let _ = child.kill().await;
                    child.wait().await.ok()
                }
            }
        } else {
            child.wait().await.ok()
        };
        if exit_code.is_none() {
            exit_code = status.and_then(|status| status.code());
        }
        let _ = stdout_task.await;
        let _ = stderr_task.await;
        while receiver.try_recv().is_ok() {}

        emit_job(
            &app_for_task,
            JobEvent {
                job_id: job_for_task.clone(),
                kind: "exit".to_string(),
                data: Some(json!(exit_code)),
            },
        );

        if cancellable_for_task {
            state_for_task.jobs.lock().await.remove(&job_for_task);
        }
        if mutating {
            let mut write_job = state_for_task.write_job.lock().await;
            if write_job.as_deref() == Some(job_for_task.as_str()) {
                *write_job = None;
            }
        }
    });

    Ok(JobStart {
        job_id,
        cancellable,
        mutating,
    })
}

#[tauri::command]
pub async fn cancel_cli(state: State<'_, DesktopState>, job_id: String) -> Result<(), String> {
    let sender = state.jobs.lock().await.remove(&job_id);
    match sender {
        Some(sender) => sender
            .send(())
            .map_err(|_| "任务已经结束，无法取消。".to_string()),
        None => Err("该任务不可取消或已经结束。".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| value.to_string()).collect()
    }

    #[test]
    fn recognizes_mutating_and_read_only_commands() {
        assert!(is_mutating(&args(&["restart"])));
        assert!(is_mutating(&args(&[
            "config",
            "set",
            "gateway.port",
            "3100"
        ])));
        assert!(is_mutating(&args(&[
            "extensions",
            "config",
            "demo",
            "--set",
            "limit=20"
        ])));
        assert!(is_mutating(&args(&["extensions", "setup", "demo"])));
        assert!(is_mutating(&args(&[
            "extensions",
            "setup",
            "demo",
            "--uninstall"
        ])));
        assert!(!is_mutating(&args(&[
            "extensions",
            "setup",
            "demo",
            "--status"
        ])));
        assert!(!is_mutating(&args(&["status"])));
        assert!(!is_mutating(&args(&["config", "get", "--all"])));
        assert!(!is_mutating(&args(&["extensions", "list"])));
    }

    #[test]
    fn only_marks_long_running_jobs_cancellable() {
        assert!(is_cancellable(&args(&["logs", "gateway", "-f"])));
        assert!(is_cancellable(&args(&["search", "query"])));
        assert!(is_cancellable(&args(&["update", "apply"])));
        assert!(!is_cancellable(&args(&[
            "config",
            "set",
            "gateway.port",
            "3100"
        ])));
        assert!(!is_cancellable(&args(&["start"])));
    }

    #[test]
    fn separates_result_events_and_diagnostic_stdout() {
        let (kind, value) =
            parse_stdout_line(r#"{"schema_version":1,"ok":true,"command":"status","data":{}}"#);
        assert_eq!(kind, "result");
        assert_eq!(value["command"], "status");

        let (kind, value) =
            parse_stdout_line(r#"{"type":"event","schema_version":1,"event":"log","line":"x"}"#);
        assert_eq!(kind, "stdout");
        assert_eq!(value["event"], "log");
    }
}
