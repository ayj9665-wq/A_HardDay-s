//! macOS application detection.
//!
//! Applications come from `NSWorkspace`, which reports processes rather than
//! windows. Window titles are deliberately absent: reading them needs the
//! screen-recording permission, and this app has no reason to ask for it.

use crate::{foreground_changed, RunningApplication};
use block2::RcBlock;
use objc2_app_kit::{
    NSApplicationActivationPolicy, NSRunningApplication, NSWorkspace,
    NSWorkspaceDidActivateApplicationNotification,
};
use objc2_foundation::NSNotification;
use std::{
    path::{Path, PathBuf},
    ptr::NonNull,
    sync::OnceLock,
};

pub const SUPPORTED: bool = true;

/// True when the path is the bundle or binary this process itself runs from.
/// The Windows side skips its own window for the same reason: when this app
/// takes focus the frontend must hear "nothing tracked" rather than itself.
fn is_this_app(path: &str) -> bool {
    static OWN_EXECUTABLE: OnceLock<Option<PathBuf>> = OnceLock::new();
    OWN_EXECUTABLE
        .get_or_init(|| std::env::current_exe().ok())
        .as_ref()
        .is_some_and(|executable| executable.starts_with(path))
}

/// Describes an application the way a person picks it out of a list. The bundle
/// path is the identity, because it survives updates and relaunches.
fn describe(application: &NSRunningApplication) -> Option<RunningApplication> {
    // Only applications with a Dock presence. Agents, helpers and daemons are
    // running too, but nobody chooses to "work in" one.
    if application.activationPolicy() != NSApplicationActivationPolicy::Regular {
        return None;
    }

    let path = application
        .bundleURL()
        .or_else(|| application.executableURL())
        .and_then(|url| url.path())
        .map(|path| path.to_string())?;
    if is_this_app(&path) {
        return None;
    }

    let process_name = Path::new(&path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())?;
    let name = application
        .localizedName()
        .map(|value| value.to_string())
        .unwrap_or_else(|| {
            Path::new(&process_name)
                .file_stem()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|| process_name.clone())
        });
    let detail = application
        .bundleIdentifier()
        .map(|value| value.to_string())
        .unwrap_or_else(|| path.clone());

    Some(RunningApplication {
        name,
        process_name,
        executable_path: path,
        detail,
    })
}

pub fn list_running() -> Vec<RunningApplication> {
    let workspace = NSWorkspace::sharedWorkspace();
    let mut applications: Vec<RunningApplication> = workspace
        .runningApplications()
        .iter()
        .filter_map(|application| describe(&application))
        .collect();
    applications
        .sort_by(|first, second| first.name.to_lowercase().cmp(&second.name.to_lowercase()));
    applications
}

pub fn foreground() -> Option<RunningApplication> {
    let workspace = NSWorkspace::sharedWorkspace();
    let frontmost = workspace.frontmostApplication()?;
    describe(&frontmost)
}

/// Subscribes to the workspace notification that fires when another application
/// is activated. Nothing polls: AppKit delivers this on the main run loop.
pub fn watch_foreground() {
    let workspace = NSWorkspace::sharedWorkspace();
    let center = workspace.notificationCenter();
    let block = RcBlock::new(|_notification: NonNull<NSNotification>| {
        foreground_changed();
    });

    let observer = unsafe {
        center.addObserverForName_object_queue_usingBlock(
            Some(NSWorkspaceDidActivateApplicationNotification),
            None,
            None,
            &block,
        )
    };
    // The notification center hands back a token that has to stay alive for the
    // subscription to stay alive. This one lasts as long as the process, so it
    // is leaked on purpose rather than dropped at the end of this function.
    std::mem::forget(observer);
}
