use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, RwLock};

use tokio::sync::{oneshot, Mutex};

use crate::models::PersistedSettings;

pub type CancelSender = oneshot::Sender<()>;

#[derive(Clone)]
pub struct DesktopState {
    pub settings: Arc<RwLock<PersistedSettings>>,
    pub root: Arc<RwLock<Option<PathBuf>>>,
    pub jobs: Arc<Mutex<HashMap<String, CancelSender>>>,
    pub write_job: Arc<Mutex<Option<String>>>,
    pub quitting: Arc<AtomicBool>,
}

impl DesktopState {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(RwLock::new(PersistedSettings::default())),
            root: Arc::new(RwLock::new(None)),
            jobs: Arc::new(Mutex::new(HashMap::new())),
            write_job: Arc::new(Mutex::new(None)),
            quitting: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn hydrate(&self, settings: PersistedSettings) {
        let root = settings.root.as_ref().map(PathBuf::from);
        *self.settings.write().expect("settings lock poisoned") = settings;
        *self.root.write().expect("root lock poisoned") = root;
    }

    pub fn set_root(&self, root: Option<PathBuf>) {
        *self.root.write().expect("root lock poisoned") = root;
    }

    pub fn root(&self) -> Option<PathBuf> {
        self.root.read().expect("root lock poisoned").clone()
    }

    pub async fn busy_job(&self) -> Option<String> {
        self.write_job.lock().await.clone()
    }

    pub async fn is_busy(&self) -> bool {
        self.busy_job().await.is_some()
    }
}

impl Default for DesktopState {
    fn default() -> Self {
        Self::new()
    }
}
