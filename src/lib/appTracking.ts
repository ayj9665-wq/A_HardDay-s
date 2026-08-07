import type { LinkedApplication, RunningApplication } from "../types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function applicationIdentity(application: Pick<LinkedApplication, "executablePath">): string {
  return application.executablePath.trim().toLocaleLowerCase();
}

export function applicationsMatch(
  linked: Pick<LinkedApplication, "executablePath">,
  running: RunningApplication | null,
): boolean {
  if (!running) return false;
  return applicationIdentity(linked) === applicationIdentity(running);
}

export async function listRunningApplications(): Promise<RunningApplication[]> {
  if (!isTauriRuntime()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RunningApplication[]>("list_running_applications");
}

export async function getForegroundApplication(): Promise<RunningApplication | null> {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RunningApplication | null>("get_foreground_application");
}
