// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalogClock } from "./AnalogClock";

let nextFrame: FrameRequestCallback | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextFrame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  nextFrame = null;
});

function runFrame(): void {
  const frame = nextFrame;
  if (!frame) throw new Error("Animation frame was not scheduled");
  act(() => frame(performance.now()));
}

describe("AnalogClock", () => {
  it("updates the real hour and minute hands as time advances", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 15, 0, 0));
    const { container } = render(<AnalogClock activeHour={12} />);

    runFrame();
    const hourHand = container.querySelector<SVGLineElement>(".clock-hand--hour")!;
    const minuteHand = container.querySelector<SVGLineElement>(".clock-hand--minute")!;
    const firstHour = hourHand.getAttribute("transform");
    const firstMinute = minuteHand.getAttribute("transform");

    vi.setSystemTime(new Date(2026, 0, 1, 3, 15, 10, 0));
    runFrame();

    expect(hourHand.getAttribute("transform")).not.toBe(firstHour);
    expect(minuteHand.getAttribute("transform")).not.toBe(firstMinute);
  });

  it("keeps the red task hand fixed at the active task hour", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 15, 0, 0));
    const { container } = render(<AnalogClock activeHour={2} />);

    runFrame();
    const taskHand = container.querySelector<SVGLineElement>(".clock-hand--second")!;
    expect(taskHand.getAttribute("transform")).toBe("rotate(60 180 180)");

    vi.setSystemTime(new Date(2026, 0, 1, 3, 15, 30, 0));
    runFrame();
    expect(taskHand.getAttribute("transform")).toBe("rotate(60 180 180)");
  });

  it("offsets the task hand using accumulated work at hour-hand speed", () => {
    const { container } = render(<AnalogClock activeHour={2} trackedSeconds={3_600} />);
    runFrame();
    const taskHand = container.querySelector<SVGLineElement>(".clock-hand--second")!;
    expect(taskHand.getAttribute("transform")).toBe("rotate(90 180 180)");
  });
});
