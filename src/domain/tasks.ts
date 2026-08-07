import {
  CLOCK_HOURS,
  type AppState,
  type BackgroundMode,
  type ClockHour,
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

export function hourToAngle(hour: ClockHour): number {
  return (hour % 12) * 30;
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

export function getPeriodLabel(date: Date): "Morning" | "Noon" | "Night" {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Noon";
  return "Night";
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
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
    });
  }

  return normalized;
}

export function normalizeState(value: unknown): AppState {
  const source = value && typeof value === "object"
    ? (value as Omit<Partial<AppState>, "backgroundMode"> & {
        backgroundMode?: BackgroundMode | "glass";
        backgroundTransparent?: boolean;
      })
    : {};
  const tasks = normalizeTasks(source.tasks);
  const activeExists = tasks.some(
    (task) => task.id === source.activeTaskId && !task.completed,
  );
  const firstIncomplete = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => getHourPriority(a.hourSlot) - getHourPriority(b.hourSlot))[0];

  const backgroundMode: BackgroundMode = source.backgroundMode === "clear" ||
    source.backgroundMode === "glass" ||
    source.backgroundTransparent
    ? "clear"
    : "solid";

  return {
    tasks,
    activeTaskId: activeExists ? (source.activeTaskId ?? null) : (firstIncomplete?.id ?? null),
    backgroundMode,
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
    createdAt: now,
    updatedAt: now,
  };
}
