import { applicationIdentity } from "../core/applications";
import {
  CLOCK_HOURS,
  type AppState,
  type BackgroundMode,
  type ClockHour,
  type LinkedApplication,
  type Task,
} from "../types";

export const MAX_TASKS = 6;
export const BACKGROUND_MODES: BackgroundMode[] = ["solid", "clear"];

export function getNextBackgroundMode(mode: BackgroundMode): BackgroundMode {
  const index = BACKGROUND_MODES.indexOf(mode);
  return BACKGROUND_MODES[(index + 1) % BACKGROUND_MODES.length];
}

export function sanitizeTaskText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isClockHour(value: unknown): value is ClockHour {
  return typeof value === "number" && CLOCK_HOURS.includes(value as ClockHour);
}

function normalizeLinkedApplications(value: unknown): LinkedApplication[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const applications: LinkedApplication[] = [];

  for (const candidate of value) {
    if (applications.length >= 12 || !candidate || typeof candidate !== "object") break;
    const source = candidate as Partial<LinkedApplication>;
    const executablePath = typeof source.executablePath === "string"
      ? source.executablePath.trim()
      : "";
    const processName = typeof source.processName === "string" ? source.processName.trim() : "";
    if (!executablePath || !processName) continue;
    const identity = executablePath.toLocaleLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    applications.push({
      name: typeof source.name === "string" && source.name.trim()
        ? source.name.trim()
        : processName.replace(/\.exe$/i, ""),
      processName,
      executablePath,
      trackedSeconds: typeof source.trackedSeconds === "number" && Number.isFinite(source.trackedSeconds)
        ? Math.max(0, source.trackedSeconds)
        : 0,
    });
  }

  return applications;
}

export function hourToAngle(hour: ClockHour): number {
  return (hour % 12) * 30;
}

export function trackedSecondsToAngle(seconds: number): number {
  return Math.max(0, seconds) / 120;
}

export function formatTrackedDuration(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getHourPriority(hour: ClockHour): number {
  return hour % 12;
}

export function getAvailableHours(tasks: Task[], ignoredTaskId?: string): ClockHour[] {
  const occupied = new Set(
    tasks.filter((task) => task.id !== ignoredTaskId).map((task) => task.hourSlot),
  );
  return CLOCK_HOURS.filter((hour) => !occupied.has(hour));
}

export function getDefaultHour(tasks: Task[], ignoredTaskId?: string): ClockHour | null {
  return getAvailableHours(tasks, ignoredTaskId)[0] ?? null;
}

export function getPeriodLabel(date: Date): "morning" | "noon" | "night" {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "noon";
  return "night";
}

export function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];

  const usedHours = new Set<ClockHour>();
  const normalized: Task[] = [];

  for (const candidate of value) {
    if (normalized.length >= MAX_TASKS || !candidate || typeof candidate !== "object") break;
    const item = candidate as Partial<Task>;
    const text = sanitizeTaskText(typeof item.text === "string" ? item.text : "");
    if (!text || !isClockHour(item.hourSlot) || usedHours.has(item.hourSlot)) continue;

    const now = new Date().toISOString();
    usedHours.add(item.hourSlot);
    normalized.push({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      text,
      hourSlot: item.hourSlot,
      completed: Boolean(item.completed),
      tapeVariant: item.tapeVariant === 2 ? 2 : 1,
      order: normalized.length,
      linkedApplications: normalizeLinkedApplications(item.linkedApplications),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
    });
  }

  return normalized;
}

/**
 * Defends against corrupt or hand-edited data. Older stored shapes are the
 * migrations' job, so this only has to recognise the current one.
 */
export function normalizeState(value: unknown): AppState {
  const source = value && typeof value === "object" ? (value as Partial<AppState>) : {};
  const tasks = normalizeTasks(source.tasks);
  const activeExists = tasks.some(
    (task) => task.id === source.activeTaskId && !task.completed,
  );
  const firstIncomplete = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => getHourPriority(a.hourSlot) - getHourPriority(b.hourSlot))[0];

  const backgroundMode: BackgroundMode = source.backgroundMode === "clear" ? "clear" : "solid";

  return {
    tasks,
    activeTaskId: activeExists ? (source.activeTaskId ?? null) : (firstIncomplete?.id ?? null),
    backgroundMode,
    alwaysOnTop: source.alwaysOnTop === true,
  };
}

export function pickNextActiveTask(
  tasks: Task[],
  currentHour: ClockHour,
  excludedTaskId?: string,
): string | null {
  const incomplete = tasks
    .filter((task) => !task.completed && task.id !== excludedTaskId)
    .sort((a, b) => getHourPriority(a.hourSlot) - getHourPriority(b.hourSlot));
  const currentPriority = getHourPriority(currentHour);
  return (
    incomplete.find((task) => getHourPriority(task.hourSlot) > currentPriority)?.id ??
    incomplete[0]?.id ??
    null
  );
}

/** A task's work time is the sum of what its applications earned. */
export function taskTrackedSeconds(task: Pick<Task, "linkedApplications">): number {
  return task.linkedApplications.reduce(
    (total, application) => total + application.trackedSeconds,
    0,
  );
}

/**
 * Credits work seconds to the application that earned them. The task total is
 * derived from these, so there is no second figure that could disagree.
 */
export function addTrackedSeconds(
  state: AppState,
  taskId: string,
  executablePath: string,
  seconds: number,
  now: Date = new Date(),
): AppState {
  if (seconds <= 0) return state;

  const identity = applicationIdentity({ executablePath });
  const target = state.tasks.find((task) => task.id === taskId);
  if (!target) return state;

  return {
    ...state,
    tasks: state.tasks.map((task) => task.id === taskId
      ? {
          ...task,
          linkedApplications: task.linkedApplications.map((application) =>
            applicationIdentity(application) === identity
              ? { ...application, trackedSeconds: application.trackedSeconds + seconds }
              : application),
          updatedAt: now.toISOString(),
        }
      : task),
  };
}

export function createTask(text: string, hourSlot: ClockHour, order: number): Task {
  const now = new Date().toISOString();
  const random = crypto.getRandomValues(new Uint8Array(1))[0];
  return {
    id: crypto.randomUUID(),
    text: sanitizeTaskText(text),
    hourSlot,
    completed: false,
    tapeVariant: random % 2 === 0 ? 1 : 2,
    order,
    linkedApplications: [],
    createdAt: now,
    updatedAt: now,
  };
}
