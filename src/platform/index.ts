import { tauriPlatform } from "./tauri";
import { webPlatform } from "./web";
import type { Platform } from "./types";

export type { OperatingSystem } from "./os";
export type {
  ApplicationsAdapter,
  FilesAdapter,
  Platform,
  SaveFileRequest,
  ShellAdapter,
  StorageAdapter,
  WindowAdapter,
} from "./types";

/**
 * The one place in the app that asks which runtime it is in. Everything else
 * asks the platform for a capability instead.
 */
function detectPlatform(): Platform {
  const insideTauri = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
  return insideTauri ? tauriPlatform : webPlatform;
}

let current: Platform | null = null;

export function getPlatform(): Platform {
  if (!current) current = detectPlatform();
  return current;
}

/** Test seam: swap in a fake platform, or pass nothing to restore detection. */
export function setPlatform(platform: Platform | null): void {
  current = platform;
}
