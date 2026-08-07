// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskCard } from "./TaskCard";
import type { Task } from "../types";

const linkedTask: Task = {
  id: "task-1",
  text: "Design",
  hourSlot: 2,
  completed: false,
  tapeVariant: 1,
  order: 0,
  linkedApplications: [{
    name: "Figma",
    processName: "Figma.exe",
    executablePath: "C:\\Figma.exe",
    trackedSeconds: 4_380,
  }],
  trackedSeconds: 4_380,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const callbacks = {
  onActivate: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onManageApplications: vi.fn(),
  onUpdate: vi.fn(() => null),
};

afterEach(cleanup);

describe("TaskCard application time", () => {
  it("shows each linked application's hours and minutes while inactive", () => {
    render(
      <TaskCard
        {...callbacks}
        task={linkedTask}
        index={1}
        active
        applicationActive={false}
        occupiedHours={new Set([2])}
      />,
    );

    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.getByText("01:13")).toBeInTheDocument();
    expect(screen.queryByText("(02)")).not.toBeInTheDocument();
  });

  it("restores the task number and green activity marker while tracking", () => {
    render(
      <TaskCard
        {...callbacks}
        task={linkedTask}
        index={1}
        active
        applicationActive
        occupiedHours={new Set([2])}
      />,
    );

    expect(screen.getByText("(02)")).toBeInTheDocument();
    expect(screen.getByTitle("Linked application active")).toBeInTheDocument();
    expect(screen.queryByText("01:13")).not.toBeInTheDocument();
  });
});
