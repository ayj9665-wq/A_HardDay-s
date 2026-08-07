import { describe, expect, it } from "vitest";
import {
  getAvailableHours,
  getDefaultHour,
  getHourPriority,
  getNextBackgroundMode,
  getPeriodLabel,
  hourToAngle,
  normalizeState,
  pickNextActiveTask,
  sanitizeTaskText,
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

  it("migrates the previous transparent background preference", () => {
    expect(normalizeState({ backgroundTransparent: true }).backgroundMode).toBe("clear");
    expect(normalizeState({ backgroundTransparent: false }).backgroundMode).toBe("solid");
    expect(normalizeState({ backgroundMode: "glass" }).backgroundMode).toBe("clear");
  });

  it("returns the correct title period", () => {
    expect(getPeriodLabel(new Date(2026, 0, 1, 5, 0))).toBe("Morning");
    expect(getPeriodLabel(new Date(2026, 0, 1, 12, 0))).toBe("Noon");
    expect(getPeriodLabel(new Date(2026, 0, 1, 18, 0))).toBe("Night");
    expect(getPeriodLabel(new Date(2026, 0, 1, 2, 0))).toBe("Night");
  });
});
