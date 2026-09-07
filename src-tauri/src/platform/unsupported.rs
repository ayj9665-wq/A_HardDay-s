//! Fallback for operating systems with no application detection written yet.
//! It reports the gap rather than pretending nothing is running.

use crate::RunningApplication;

pub const SUPPORTED: bool = false;

pub fn list_running() -> Vec<RunningApplication> {
    Vec::new()
}

pub fn foreground() -> Option<RunningApplication> {
    None
}

pub fn watch_foreground() {}
