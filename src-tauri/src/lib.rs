use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunningApplication {
    name: String,
    process_name: String,
    executable_path: String,
    window_title: String,
}

#[cfg(target_os = "windows")]
mod application_detection {
    use super::RunningApplication;
    use std::{
        collections::HashSet,
        ffi::OsString,
        os::windows::ffi::OsStringExt,
        path::Path,
    };
    use windows_sys::Win32::{
        Foundation::{CloseHandle, BOOL, HWND, LPARAM},
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{
            EnumWindows, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
            GetWindowThreadProcessId, IsWindowVisible,
        },
    };

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
            window_title: title,
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
        applications.retain(|application| seen.insert(application.executable_path.to_lowercase()));
        applications.sort_by(|first, second| {
            first
                .name
                .to_lowercase()
                .cmp(&second.name.to_lowercase())
        });
        applications
    }

    pub fn foreground() -> Option<RunningApplication> {
        unsafe { application_for_window(GetForegroundWindow()) }
    }
}

#[tauri::command]
fn list_running_applications() -> Vec<RunningApplication> {
    #[cfg(target_os = "windows")]
    {
        application_detection::list_running()
    }
    #[cfg(not(target_os = "windows"))]
    {
        Vec::new()
    }
}

#[tauri::command]
fn get_foreground_application() -> Option<RunningApplication> {
    #[cfg(target_os = "windows")]
    {
        application_detection::foreground()
    }
    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            list_running_applications,
            get_foreground_application
        ])
        .run(tauri::generate_context!())
        .expect("error while running A Hard Day's");
}
