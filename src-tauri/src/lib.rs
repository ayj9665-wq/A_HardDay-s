mod platform;

use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

/// One application a person could be working in.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningApplication {
    name: String,
    process_name: String,
    /// Identity that survives restarts: the `.exe` path on Windows, the `.app`
    /// bundle path on macOS.
    executable_path: String,
    /// Second line in the picker. Windows fills it with the window title, macOS
    /// with the bundle identifier — window titles there would cost a permission
    /// prompt this app does not need.
    detail: String,
}

impl RunningApplication {
    /// Must match `applicationIdentity` in `src/core/applications.ts`.
    fn identity(&self) -> String {
        self.executable_path.trim().to_lowercase()
    }
}

/// Name of the event the frontend listens on for foreground changes.
pub const FOREGROUND_CHANGED_EVENT: &str = "application://foreground-changed";

/// The OS callbacks carry no user data, so the handle has to live here.
static APP: OnceLock<AppHandle> = OnceLock::new();
/// Last application reported, so switching windows within one app stays quiet.
/// The outer `None` means "nothing announced yet", which is a different state
/// from having announced that no tracked application is in front. Without that
/// distinction the first switch *into* this app is swallowed, and the frontend
/// keeps crediting work to whichever application it read at startup.
static LAST_REPORTED: Mutex<Option<Option<String>>> = Mutex::new(None);

/// Called by the platform layer when the OS says the foreground changed. The
/// de-duplication lives here so every OS emits on the same rule.
fn foreground_changed() {
    let Some(app) = APP.get() else {
        return;
    };

    let current = platform::foreground();
    let identity = current.as_ref().map(RunningApplication::identity);

    let mut last = match LAST_REPORTED.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if last.as_ref() == Some(&identity) {
        return;
    }
    *last = Some(identity);
    drop(last);

    let _ = app.emit(FOREGROUND_CHANGED_EVENT, current);
}

/// Whether this build can inspect other applications at all. The frontend needs
/// this to tell "no applications open" apart from "not available here".
#[tauri::command]
fn application_tracking_supported() -> bool {
    platform::SUPPORTED
}

#[tauri::command]
fn list_running_applications() -> Vec<RunningApplication> {
    platform::list_running()
}

#[tauri::command]
fn get_foreground_application() -> Option<RunningApplication> {
    platform::foreground()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            application_tracking_supported,
            list_running_applications,
            get_foreground_application
        ])
        .setup(|app| {
            if APP.set(app.handle().clone()).is_ok() {
                platform::watch_foreground();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running A Hard Day's");
}
