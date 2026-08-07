// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodoComposer } from "./TodoComposer";
import type { ClockHour } from "../types";

afterEach(cleanup);

describe("TodoComposer", () => {
  it("submits a valid task with the selected hour", () => {
    const onAdd = vi.fn(() => null);
    render(
      <TodoComposer
        taskCount={0}
        occupiedHours={new Set<ClockHour>()}
        defaultHour={12}
        onAdd={onAdd}
      />,
    );

    fireEvent.change(screen.getByLabelText("New Task"), { target: { value: "Poster Design" } });
    fireEvent.click(screen.getByTitle("Place at 3'o"));
    fireEvent.submit(screen.getByLabelText("New Task").closest("form")!);

    expect(onAdd).toHaveBeenCalledWith("Poster Design", 3);
  });

  it("shows the validation error returned for an empty task", () => {
    render(
      <TodoComposer
        taskCount={0}
        occupiedHours={new Set<ClockHour>()}
        defaultHour={12}
        onAdd={() => "A task cannot be empty."}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("status").textContent).toContain("A task cannot be empty.");
  });

  it("prevents selecting an occupied hour", () => {
    render(
      <TodoComposer
        taskCount={1}
        occupiedHours={new Set<ClockHour>([12])}
        defaultHour={1}
        onAdd={() => null}
      />,
    );

    expect((screen.getByTitle("12'o is already occupied") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTitle("Place at 1'o").getAttribute("aria-pressed")).toBe("true");
  });
});
