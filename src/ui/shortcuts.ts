import { detectOperatingSystem, type OperatingSystem } from "../platform/os";

/** Keyboard handlers accept both modifiers; only the labels have to pick one. */
export function modifierLabel(os: OperatingSystem = detectOperatingSystem()): string {
  return os === "macos" ? "⌘" : "Ctrl";
}

/** Keys that mean "delete this": Windows sends one, Mac keyboards the other. */
export function isDeleteKey(key: string): boolean {
  return key === "Delete" || key === "Backspace";
}
