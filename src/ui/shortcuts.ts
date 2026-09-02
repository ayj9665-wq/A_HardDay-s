/**
 * Keyboard handlers accept both modifiers; only the labels have to choose one.
 * The webview cannot ask the OS directly, so the user agent is the signal.
 */
export function modifierLabel(userAgent = navigator.userAgent): string {
  return /Mac|iPhone|iPad/i.test(userAgent) ? "⌘" : "Ctrl";
}

/** Keys that mean "delete this": Windows sends one, Mac keyboards the other. */
export function isDeleteKey(key: string): boolean {
  return key === "Delete" || key === "Backspace";
}
