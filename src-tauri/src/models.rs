use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RootSelection {
    pub path: String,
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_path: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAppState {
    pub root: Option<String>,
    pub root_valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invalid_reason: Option<String>,
    pub platform: String,
    pub version: String,
    pub theme: String,
    pub onboarding_completed: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobStart {
    pub job_id: String,
    pub cancellable: bool,
    pub mutating: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobEvent {
    pub job_id: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PersistedSettings {
    #[serde(default)]
    pub root: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub onboarding_completed: Option<bool>,
}

fn default_theme() -> String {
    "system".to_string()
}

impl Default for PersistedSettings {
    fn default() -> Self {
        Self {
            root: None,
            theme: default_theme(),
            onboarding_completed: None,
        }
    }
}

impl PersistedSettings {
    /**
     * Settings written before the welcome wizard do not carry this field.
     * A saved root means that version of the GUI had already been configured,
     * so existing users should not be interrupted by onboarding after upgrade.
     */
    pub fn effective_onboarding_completed(&self) -> bool {
        self.onboarding_completed.unwrap_or(self.root.is_some())
    }
}

pub fn platform_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn treats_legacy_settings_with_a_root_as_complete() {
        let settings: PersistedSettings =
            serde_json::from_str(r#"{"root":"C:\\ASG","theme":"dark"}"#)
                .expect("deserialize legacy settings");
        assert!(settings.effective_onboarding_completed());
    }

    #[test]
    fn keeps_a_fresh_legacy_settings_file_pending() {
        let settings: PersistedSettings =
            serde_json::from_str(r#"{"theme":"system"}"#).expect("deserialize settings");
        assert!(!settings.effective_onboarding_completed());
    }

    #[test]
    fn preserves_an_explicit_onboarding_choice() {
        let settings: PersistedSettings = serde_json::from_str(
            r#"{"root":"C:\\ASG","theme":"dark","onboarding_completed":false}"#,
        )
        .expect("deserialize settings");
        assert!(!settings.effective_onboarding_completed());
    }
}
