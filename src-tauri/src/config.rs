use std::fs;
use std::env;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::models::{PersistedSettings, RootSelection};

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位 GUI 配置目录：{error}"))?;
    Ok(dir.join("settings.json"))
}

pub fn load_settings(app: &AppHandle) -> PersistedSettings {
    let Ok(path) = settings_path(app) else {
        return PersistedSettings::default();
    };
    let Ok(text) = fs::read_to_string(path) else {
        return PersistedSettings::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

pub fn save_settings(app: &AppHandle, settings: &PersistedSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建 GUI 配置目录：{error}"))?;
    }
    let text = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("无法序列化设置：{error}"))?;
    fs::write(path, text).map_err(|error| format!("无法保存 GUI 设置：{error}"))
}

pub fn validate_root(path: &Path) -> RootSelection {
    let path_text = path.to_string_lossy().to_string();
    let gateway = path.join("gateway.yaml");
    let cli = path.join("bin").join("asg.mjs");
    let local_node = if cfg!(target_os = "windows") {
        path.join("data")
            .join("toolchain")
            .join("node")
            .join("node.exe")
    } else {
        path.join("data")
            .join("toolchain")
            .join("node")
            .join("bin")
            .join("node")
    };

    if !path.is_dir() {
        return invalid(path_text, "所选路径不是目录。");
    }
    if !gateway.is_file() {
        return invalid(path_text, "目录中缺少 gateway.yaml。");
    }
    if !cli.is_file() {
        return invalid(path_text, "目录中缺少稳定入口 bin/asg.mjs。");
    }
    let node = if local_node.is_file() {
        Some(local_node)
    } else {
        find_system_node()
    };
    let Some(node) = node else {
        return invalid(
            path_text,
            "未找到 Node：安装根内没有 data/toolchain/node，PATH 中也没有 node。",
        );
    };

    RootSelection {
        path: path_text,
        valid: true,
        reason: None,
        node_path: Some(node.to_string_lossy().to_string()),
    }
}

fn find_system_node() -> Option<PathBuf> {
    let executable = if cfg!(target_os = "windows") {
        "node.exe"
    } else {
        "node"
    };
    env::split_paths(&env::var_os("PATH")?)
        .map(|directory| directory.join(executable))
        .find(|candidate| candidate.is_file())
}

fn invalid(path: String, reason: impl Into<String>) -> RootSelection {
    RootSelection {
        path,
        valid: false,
        reason: Some(reason.into()),
        node_path: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!("asg-gui-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(root.join("bin")).expect("create bin");
        fs::create_dir_all(root.join("data/toolchain/node")).expect("create node directory");
        fs::write(root.join("gateway.yaml"), "gateway: {}\n").expect("write config");
        fs::write(root.join("bin/asg.mjs"), "// fixture\n").expect("write cli");
        let node = if cfg!(target_os = "windows") {
            root.join("data/toolchain/node/node.exe")
        } else {
            root.join("data/toolchain/node/bin/node")
        };
        if let Some(parent) = node.parent() {
            fs::create_dir_all(parent).expect("create node parent");
        }
        fs::write(&node, "").expect("write node");
        root
    }

    #[test]
    fn accepts_complete_install_root() {
        let root = fixture_root();
        let result = validate_root(&root);
        assert!(result.valid);
        assert!(result.node_path.is_some());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn falls_back_to_node_on_path() {
        let root = fixture_root();
        let node = result_node_path(&root);
        fs::remove_file(node).expect("remove node");
        let result = validate_root(&root);
        assert!(result.valid);
        assert!(result.node_path.is_some());
        let _ = fs::remove_dir_all(root);
    }

    fn result_node_path(root: &Path) -> PathBuf {
        if cfg!(target_os = "windows") {
            root.join("data/toolchain/node/node.exe")
        } else {
            root.join("data/toolchain/node/bin/node")
        }
    }
}
