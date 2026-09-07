//! Windows application detection.
//!
//! Applications are discovered by walking visible top-level windows, so what
//! the list shows is what a person can actually switch to.

use crate::{foreground_changed, RunningApplication};
use std::{collections::HashSet, ffi::OsString, os::windows::ffi::OsStringExt, path::Path};
use windows_sys::Win32::{
    Foundation::{CloseHandle, BOOL, HWND, LPARAM},
    System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION},
    UI::{
        Accessibility::{SetWinEventHook, HWINEVENTHOOK},
        WindowsAndMessaging::{
            DispatchMessageW, EnumWindows, GetForegroundWindow, GetMessageW, GetWindowTextLengthW,
            GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible, TranslateMessage,
            EVENT_SYSTEM_FOREGROUND, MSG, WINEVENT_OUTOFCONTEXT,
        },
    },
};

pub const SUPPORTED: bool = true;

unsafe fn window_title(hwnd: HWND) -> String {
    let length = GetWindowTextLengthW(hwnd);
    if length <= 0 {
        return String::new();
    }
    let mut buffer = vec![0_u16; length as usize + 1];
    let copied = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
    OsString::from_wide(&buffer[..copied.max(0) as usize])
        .to_string_lossy()
        .trim()
        .to_string()
}

unsafe fn executable_path(process_id: u32) -> Option<String> {
    let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
    if process.is_null() {
        return None;
    }

    let mut buffer = vec![0_u16; 32_768];
    let mut length = buffer.len() as u32;
    let succeeded = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length);
    CloseHandle(process);
    if succeeded == 0 || length == 0 {
        return None;
    }

    Some(
        OsString::from_wide(&buffer[..length as usize])
            .to_string_lossy()
            .to_string(),
    )
}

unsafe fn application_for_window(hwnd: HWND) -> Option<RunningApplication> {
    if hwnd.is_null() || IsWindowVisible(hwnd) == 0 {
        return None;
    }
    let title = window_title(hwnd);
    if title.is_empty() {
        return None;
    }

    let mut process_id = 0_u32;
    GetWindowThreadProcessId(hwnd, &mut process_id);
    if process_id == 0 || process_id == std::process::id() {
        return None;
    }
    let path = executable_path(process_id)?;
    let process_name = Path::new(&path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())?;
    let name = Path::new(&process_name)
        .file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| process_name.clone());

    Some(RunningApplication {
        name,
        process_name,
        executable_path: path,
        detail: title,
    })
}

unsafe extern "system" fn collect_window(hwnd: HWND, data: LPARAM) -> BOOL {
    let applications = &mut *(data as *mut Vec<RunningApplication>);
    if let Some(application) = application_for_window(hwnd) {
        applications.push(application);
    }
    1
}

pub fn list_running() -> Vec<RunningApplication> {
    let mut applications: Vec<RunningApplication> = Vec::new();
    unsafe {
        EnumWindows(Some(collect_window), &mut applications as *mut _ as LPARAM);
    }
    let mut seen = HashSet::new();
    applications.retain(|application| seen.insert(application.identity()));
    applications.sort_by_key(|application| application.name.to_lowercase());
    applications
}

pub fn foreground() -> Option<RunningApplication> {
    unsafe { application_for_window(GetForegroundWindow()) }
}

unsafe extern "system" fn on_foreground_changed(
    _hook: HWINEVENTHOOK,
    _event: u32,
    _window: HWND,
    _object_id: i32,
    _child_id: i32,
    _thread_id: u32,
    _timestamp: u32,
) {
    foreground_changed();
}

/// Installs a system hook that fires only when the foreground window changes.
/// Nothing polls: the thread below exists purely to pump the hook's messages.
pub fn watch_foreground() {
    std::thread::spawn(|| unsafe {
        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            std::ptr::null_mut(),
            Some(on_foreground_changed),
            0,
            0,
            // Deliberately not SKIPOWNPROCESS: when this app takes focus the
            // frontend must hear about it so tracking pauses.
            WINEVENT_OUTOFCONTEXT,
        );
        if hook.is_null() {
            return;
        }

        let mut message: MSG = std::mem::zeroed();
        while GetMessageW(&mut message, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    });
}
