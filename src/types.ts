export const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export type ClockHour = (typeof CLOCK_HOURS)[number];
export type BackgroundMode = "solid" | "clear";

export type LinkedApplication = {
  name: string;
  processName: string;
  executablePath: string;
  trackedSeconds: number;
};

export type RunningApplication = Omit<LinkedApplication, "trackedSeconds"> & {
  windowTitle: string;
};

export type Task = {
  id: string;
  text: string;
  hourSlot: ClockHour;
  completed: boolean;
  tapeVariant: 1 | 2;
  order: number;
  /** Work time is credited per application; the task total is derived from these. */
  linkedApplications: LinkedApplication[];
  createdAt: string;
  updatedAt: string;
};

export type AppState = {
  tasks: Task[];
  activeTaskId: string | null;
  backgroundMode: BackgroundMode;
  alwaysOnTop: boolean;
};

export type TaskDraft = {
  text: string;
  hourSlot: ClockHour;
};
