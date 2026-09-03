export type OperatingSystem = "windows" | "macos" | "other";

function classify(userAgent: string): OperatingSystem {
  if (/Mac|iPhone|iPad/i.test(userAgent)) return "macos";
  if (/Win/i.test(userAgent)) return "windows";
  return "other";
}

let detected: OperatingSystem | null = null;

/**
 * Which OS the app is running on, for the few places where the two genuinely
 * differ — where the window buttons belong, what the modifier key is called.
 * The webview cannot ask the system directly, so the user agent is the signal.
 * Cached because the answer cannot change while the app runs.
 */
export function detectOperatingSystem(userAgent?: string): OperatingSystem {
  if (userAgent !== undefined) return classify(userAgent);
  if (!detected) detected = classify(navigator.userAgent);
  return detected;
}
