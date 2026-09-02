//! One implementation of the OS integration per operating system.
//!
//! Every module here exposes the same four items, so `lib.rs` never asks which
//! OS it is on. A platform that cannot inspect other applications says so
//! through `SUPPORTED` instead of quietly answering "none found" — the UI shows
//! a different message for the two cases, and only this flag can tell them
//! apart.

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::{foreground, list_running, watch_foreground, SUPPORTED};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{foreground, list_running, watch_foreground, SUPPORTED};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod unsupported;
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub use unsupported::{foreground, list_running, watch_foreground, SUPPORTED};
