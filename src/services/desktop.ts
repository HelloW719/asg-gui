import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import type {
  CliResult,
  DesktopAppState,
  JobEvent,
  JobStart,
  RootSelection,
  ThemePreference,
} from "../types/cli";

export const inTauri = isTauri();

export async function getDesktopAppState(): Promise<DesktopAppState> {
  return invoke<DesktopAppState>("get_app_state");
}

export async function chooseAsgRoot(): Promise<RootSelection | null> {
  return invoke<RootSelection | null>("choose_asg_root");
}

export async function setAsgRoot(path: string): Promise<RootSelection> {
  return invoke<RootSelection>("set_asg_root", { path });
}

export async function clearAsgRoot(): Promise<void> {
  await invoke("clear_asg_root");
}

export async function setDesktopTheme(theme: ThemePreference): Promise<void> {
  await invoke("set_theme", { theme });
}

export async function startCliJob(
  args: string[],
  stdin: string | null,
  mode: "json" | "jsonl",
): Promise<JobStart> {
  return invoke<JobStart>("run_cli", { args, stdin, mode });
}

export async function cancelCliJob(jobId: string): Promise<void> {
  await invoke("cancel_cli", { jobId });
}

export async function revealWindow(): Promise<void> {
  if (inTauri) await invoke("show_window");
}

export async function hideWindow(): Promise<void> {
  if (inTauri) await invoke("hide_window");
}

export async function quitGui(): Promise<void> {
  if (inTauri) await invoke("quit_gui");
}

export async function listenJobEvents(
  handler: (event: JobEvent) => void,
): Promise<UnlistenFn> {
  return listen<JobEvent>("asg://job", (event) => handler(event.payload));
}

export async function listenNavigate(
  handler: (route: string) => void,
): Promise<UnlistenFn> {
  return listen<string>("asg://navigate", (event) => handler(event.payload));
}

export async function listenQuitBlocked(
  handler: (payload: { message?: string; jobId?: string }) => void,
): Promise<UnlistenFn> {
  return listen<{ message?: string; jobId?: string }>("asg://quit-blocked", (event) =>
    handler(event.payload),
  );
}

export interface RunningJob {
  jobId: string;
  cancellable: boolean;
  mutating: boolean;
  done: Promise<CliResult>;
  cancel: () => Promise<void>;
}

interface InternalJob {
  events: JobEvent[];
  listeners: Set<(event: JobEvent) => void>;
  result?: CliResult;
  resolve: (result: CliResult) => void;
  reject: (error: unknown) => void;
  done: Promise<CliResult>;
}

class JobClient {
  private initialization: Promise<void> | null = null;
  private readonly jobs = new Map<string, InternalJob>();
  private readonly unbound = new Map<string, JobEvent[]>();

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = listenJobEvents((event) => this.handleEvent(event)).then(() => {
        // The promise resolves to the unlisten function; it lives for the app lifetime.
      });
    }
    return this.initialization;
  }

  async start(
    args: string[],
    options: {
      stdin?: string | null;
      mode?: "json" | "jsonl";
      onEvent?: (event: JobEvent) => void;
    } = {},
  ): Promise<RunningJob> {
    if (!inTauri) {
      throw new Error("CLI 桥接只在 Tauri 桌面窗口中可用。");
    }
    await this.initialize();
    const started = await startCliJob(args, options.stdin ?? null, options.mode ?? "json");
    const job = this.ensure(started.jobId);
    if (options.onEvent) job.listeners.add(options.onEvent);
    return {
      jobId: started.jobId,
      cancellable: started.cancellable,
      mutating: started.mutating,
      done: job.done,
      cancel: () => cancelCliJob(started.jobId),
    };
  }

  private ensure(jobId: string): InternalJob {
    const existing = this.jobs.get(jobId);
    if (existing) return existing;

    let resolve!: (result: CliResult) => void;
    let reject!: (error: unknown) => void;
    const done = new Promise<CliResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const job: InternalJob = {
      events: [],
      listeners: new Set(),
      resolve,
      reject,
      done,
    };
    this.jobs.set(jobId, job);
    for (const event of this.unbound.get(jobId) ?? []) this.applyEvent(job, event);
    this.unbound.delete(jobId);
    return job;
  }

  private handleEvent(event: JobEvent): void {
    const job = this.jobs.get(event.jobId);
    if (!job) {
      const buffered = this.unbound.get(event.jobId) ?? [];
      buffered.push(event);
      this.unbound.set(event.jobId, buffered);
      return;
    }
    this.applyEvent(job, event);
  }

  private applyEvent(job: InternalJob, event: JobEvent): void {
    job.events.push(event);
    for (const listener of job.listeners) listener(event);

    if (event.kind === "result") {
      const candidate = event.data;
      if (
        candidate &&
        typeof candidate === "object" &&
        (candidate as { schema_version?: unknown }).schema_version === 1
      ) {
        job.result = candidate as CliResult;
      }
    }

    if (event.kind === "cancelled") {
      job.reject(new Error("任务已取消"));
    }

    if (event.kind === "exit") {
      if (job.result) {
        job.resolve(job.result);
      } else {
        const code =
          typeof event.data === "number"
            ? `（退出码 ${event.data}）`
            : "";
        job.reject(new Error(`CLI 任务未返回结构化结果${code}`));
      }
      setTimeout(() => this.jobs.delete(event.jobId), 1_000);
    }
  }
}

export const jobClient = new JobClient();

