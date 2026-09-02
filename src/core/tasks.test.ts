import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import {
  addTrackedSeconds,
  getAvailableHours,
  getDefaultHour,
  formatTrackedDuration,
  getHourPriority,
  getNextBackgroundMode,
  getPeriodLabel,
  hourToAngle,
  normalizeState,
  pickNextActiveTask,
  sanitizeTaskText,
  taskTrackedSeconds,
  trackedSecondsToAngle,
} from "./tasks";
import type { Task } from "../types";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? "task-1",
    text: overrides.text ?? "Test task",
    hourSlot: overrides.hourSlot ?? 12,
    completed: overrides.completed ?? false,
    tapeVariant: overrides.tapeVariant ?? 1,
    order: overrides.order ?? 0,
    linkedApplications: overrides.linkedApplications ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("task domain", () => {
  it("trims task text and collapses whitespace", () => {
    expect(sanitizeTaskText("  New   task  ")).toBe("New task");
    expect(sanitizeTaskText("   ")).toBe("");
  });

  it("uses 12 o'clock as the first default and skips occupied hours", () => {
    expect(getDefaultHour([])).toBe(12);
    expect(getDefaultHour([task({ hourSlot: 12 })])).toBe(1);
    expect(getAvailableHours([task({ hourSlot: 12 })])).not.toContain(12);
  });

  it("maps clock hours to SVG angles", () => {
    expect(hourToAngle(12)).toBe(0);
    expect(hourToAngle(3)).toBe(90);
    expect(hourToAngle(11)).toBe(330);
  });

  it("moves tracked work at the same rate as an hour hand", () => {
    expect(trackedSecondsToAngle(0)).toBe(0);
    expect(trackedSecondsToAngle(3_600)).toBe(30);
    expect(trackedSecondsToAngle(43_200)).toBe(360);
  });

  it("formats application work in hours and minutes", () => {
    expect(formatTrackedDuration(0)).toBe("00:00");
    expect(formatTrackedDuration(4_380)).toBe("01:13");
  });

  it("orders task numbers clockwise from 12 o'clock", () => {
    const hours = [8, 2, 12, 5] as const;
    expect([...hours].sort((a, b) => getHourPriority(a) - getHourPriority(b))).toEqual([
      12,
      2,
      5,
      8,
    ]);
  });

  it("cycles background modes between solid and clear", () => {
    expect(getNextBackgroundMode("solid")).toBe("clear");
    expect(getNextBackgroundMode("clear")).toBe("solid");
  });

  it("selects the next unfinished task and wraps to the first", () => {
    const tasks = [
      task({ id: "a", order: 0, completed: true }),
      task({ id: "b", order: 5, hourSlot: 1 }),
      task({ id: "c", order: 1, hourSlot: 2 }),
    ];
    expect(pickNextActiveTask(tasks, 12)).toBe("b");
    expect(pickNextActiveTask(tasks, 2)).toBe("b");
  });

  it("removes invalid and colliding persisted tasks", () => {
    const state = normalizeState({
      tasks: [
        task({ id: "valid", hourSlot: 3 }),
        task({ id: "collision", hourSlot: 3 }),
        task({ id: "blank", text: "   ", hourSlot: 4 }),
      ],
      activeTaskId: "missing",
    });
    expect(state.tasks).toHaveLength(1);
    expect(state.activeTaskId).toBe("valid");
  });

  it("removes duplicate and invalid application links", () => {
    const state = normalizeState({
      tasks: [task({
        linkedApplications: [
          { name: "Code", processName: "Code.exe", executablePath: "C:\\Code.exe", trackedSeconds: 73 },
          { name: "Duplicate", processName: "Code.exe", executablePath: "c:\\code.exe", trackedSeconds: 0 },
          { name: "Invalid", processName: "", executablePath: "", trackedSeconds: 0 },
        ],
      })],
    });

    expect(state.tasks[0].linkedApplications).toEqual([
      { name: "Code", processName: "Code.exe", executablePath: "C:\\Code.exe", trackedSeconds: 73 },
    ]);
  });

  it("ignores a task total stored before it became a derived figure", () => {
    const state = normalizeState({
      tasks: [{
        ...task({
          linkedApplications: [
            { name: "Code", processName: "Code.exe", executablePath: "C:\\Code.exe", trackedSeconds: 73 },
          ],
        }),
        // Written by an older build that kept its own copy of the total.
        trackedSeconds: 125.5,
      }],
    });

    expect(state.tasks[0]).not.toHaveProperty("trackedSeconds");
    expect(taskTrackedSeconds(state.tasks[0])).toBe(73);
  });

  it("accepts only the background modes it knows", () => {
    expect(normalizeState({ backgroundMode: "clear" }).backgroundMode).toBe("clear");
    expect(normalizeState({ backgroundMode: "solid" }).backgroundMode).toBe("solid");
    expect(normalizeState({ backgroundMode: "glass" }).backgroundMode).toBe("solid");
    expect(normalizeState({}).backgroundMode).toBe("solid");
  });

  it("restores the always-on-top preference safely", () => {
    expect(normalizeState({ alwaysOnTop: true }).alwaysOnTop).toBe(true);
    expect(normalizeState({ alwaysOnTop: "yes" }).alwaysOnTop).toBe(false);
    expect(normalizeState(null).alwaysOnTop).toBe(false);
  });

  it("returns the correct title period", () => {
    expect(getPeriodLabel(new Date(2026, 0, 1, 5, 0))).toBe("morning");
    expect(getPeriodLabel(new Date(2026, 0, 1, 12, 0))).toBe("noon");
    expect(getPeriodLabel(new Date(2026, 0, 1, 18, 0))).toBe("night");
    expect(getPeriodLabel(new Date(2026, 0, 1, 2, 0))).toBe("night");
  });
});

describe("tracked seconds", () => {
  const stateWith = (...paths: string[]): AppState => ({
    tasks: [{
      id: "task-1",
      text: "Poster",
      hourSlot: 3,
      completed: false,
      tapeVariant: 1,
      order: 0,
      linkedApplications: paths.map((executablePath) => ({
        name: "App",
        processName: "app.exe",
        executablePath,
        trackedSeconds: 0,
      })),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }],
    activeTaskId: "task-1",
    backgroundMode: "solid",
    alwaysOnTop: false,
  });

  const totals = (state: AppState) => ({
    task: taskTrackedSeconds(state.tasks[0]),
    applications: state.tasks[0].linkedApplications.map((one) => one.trackedSeconds),
  });

  it("credits the task and the application that earned the time", () => {
    const next = addTrackedSeconds(stateWith("C:\\Apps\\Code.exe"), "task-1", "C:\\Apps\\Code.exe", 12);

    expect(totals(next)).toEqual({ task: 12, applications: [12] });
  });

  it("matches the application regardless of path casing", () => {
    const next = addTrackedSeconds(stateWith("C:\\Apps\\Code.exe"), "task-1", "c:\\apps\\CODE.EXE", 7);

    expect(totals(next)).toEqual({ task: 7, applications: [7] });
  });

  it("credits a macOS bundle path the same way", () => {
    const state = stateWith("/Applications/Safari.app", "/Applications/Figma.app");
    const next = addTrackedSeconds(state, "task-1", "/Applications/Figma.app", 11);

    expect(totals(next)).toEqual({ task: 11, applications: [0, 11] });
  });

  it("credits only the application that was in the foreground", () => {
    const state = stateWith("C:\\Apps\\Code.exe", "C:\\Apps\\Figma.exe");
    const next = addTrackedSeconds(state, "task-1", "C:\\Apps\\Figma.exe", 9);

    expect(totals(next)).toEqual({ task: 9, applications: [0, 9] });
  });

  it("drops an application's time along with the link when it is unlinked", () => {
    const state = addTrackedSeconds(
      stateWith("C:\\Apps\\Code.exe", "C:\\Apps\\Figma.exe"),
      "task-1",
      "C:\\Apps\\Figma.exe",
      30,
    );
    const unlinked = {
      ...state.tasks[0],
      linkedApplications: state.tasks[0].linkedApplications.filter(
        (one) => !one.executablePath.includes("Figma"),
      ),
    };

    expect(taskTrackedSeconds(state.tasks[0])).toBe(30);
    expect(taskTrackedSeconds(unlinked)).toBe(0);
  });

  it("keeps the task total equal to the sum of its applications", () => {
    let state = stateWith("C:\\Apps\\Code.exe", "C:\\Apps\\Figma.exe");
    for (const [path, seconds] of [["C:\\Apps\\Code.exe", 5], ["C:\\Apps\\Figma.exe", 8], ["C:\\Apps\\Code.exe", 3]] as const) {
      state = addTrackedSeconds(state, "task-1", path, seconds);
    }

    const { task, applications } = totals(state);
    expect(task).toBe(applications.reduce((sum, one) => sum + one, 0));
    expect(task).toBe(16);
  });

  it("leaves state untouched for an unknown task or an empty interval", () => {
    const state = stateWith("C:\\Apps\\Code.exe");

    expect(addTrackedSeconds(state, "missing", "C:\\Apps\\Code.exe", 5)).toBe(state);
    expect(addTrackedSeconds(state, "task-1", "C:\\Apps\\Code.exe", 0)).toBe(state);
    expect(addTrackedSeconds(state, "task-1", "C:\\Apps\\Code.exe", -3)).toBe(state);
  });

  it("stamps the task as updated when time lands on it", () => {
    const next = addTrackedSeconds(
      stateWith("C:\\Apps\\Code.exe"),
      "task-1",
      "C:\\Apps\\Code.exe",
      4,
      new Date("2026-08-14T09:30:00.000Z"),
    );

    expect(next.tasks[0].updatedAt).toBe("2026-08-14T09:30:00.000Z");
  });
});
