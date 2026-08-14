import type { LinkedApplication, RunningApplication } from "../types";

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
