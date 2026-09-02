import type { LinkedApplication, RunningApplication } from "../types";

/**
 * Windows paths are case-insensitive and macOS bundle paths are too in practice,
 * so identity ignores case. The locale is pinned because the host's locale must
 * not decide whether two paths are the same application — a Turkish system folds
 * "I" to a different letter and would silently stop matching.
 */
export function applicationIdentity(application: Pick<LinkedApplication, "executablePath">): string {
  return application.executablePath.trim().toLowerCase();
}

export function applicationsMatch(
  linked: Pick<LinkedApplication, "executablePath">,
  running: RunningApplication | null,
): boolean {
  if (!running) return false;
  return applicationIdentity(linked) === applicationIdentity(running);
}
