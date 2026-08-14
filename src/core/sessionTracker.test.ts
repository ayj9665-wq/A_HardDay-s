import { describe, expect, it } from "vitest";
import { createSessionTracker } from "./sessionTracker";

/** Drives the tracker from a hand-cranked clock instead of real time. */
function fakeClock(start = 0) {
  let value = start;
  return {
    now: () => value,
    advanceSeconds(seconds: number) {
      value += seconds * 1_000;
    },
  };
}

describe("session tracker", () => {
  it("accumulates quietly until the flush threshold", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, maxSampleSeconds: 1.5 });

    clock.advanceSeconds(1);
    expect(tracker.sample()).toBe(0);
    clock.advanceSeconds(1);
    expect(tracker.sample()).toBe(0);
    expect(tracker.pending()).toBe(2);
  });

  it("hands over the whole batch once the threshold is crossed", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, flushAfterSeconds: 5 });

    for (let step = 0; step < 4; step += 1) {
      clock.advanceSeconds(1.5);
      tracker.sample();
    }

    expect(tracker.pending()).toBe(0);
  });

  it("caps a single step so a suspended machine cannot bank hours", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, maxSampleSeconds: 1.5 });

    clock.advanceSeconds(4 * 60 * 60);
    tracker.sample();

    expect(tracker.pending()).toBe(1.5);
  });

  it("never counts the same seconds twice", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({
      now: clock.now,
      maxSampleSeconds: 10,
      flushAfterSeconds: 5,
    });
    let total = 0;

    for (let step = 0; step < 6; step += 1) {
      clock.advanceSeconds(3);
      total += tracker.sample();
    }
    total += tracker.stop();

    expect(total).toBe(18);
  });

  it("pays out the remainder when tracking stops", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, maxSampleSeconds: 10 });

    clock.advanceSeconds(2);
    expect(tracker.sample()).toBe(0);
    expect(tracker.stop()).toBe(2);
  });

  it("drops a remainder too small to be real work", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, minimumFlushSeconds: 0.05 });

    clock.advanceSeconds(0.01);

    expect(tracker.stop()).toBe(0);
  });

  it("refuses to keep counting after it stops", () => {
    const clock = fakeClock();
    const tracker = createSessionTracker({ now: clock.now, maxSampleSeconds: 10 });

    clock.advanceSeconds(3);
    expect(tracker.stop()).toBe(3);

    clock.advanceSeconds(30);
    expect(tracker.sample()).toBe(0);
    expect(tracker.stop()).toBe(0);
  });

  it("ignores a clock that jumps backwards", () => {
    const clock = fakeClock(10_000);
    const tracker = createSessionTracker({ now: clock.now });

    clock.advanceSeconds(-5);

    expect(tracker.sample()).toBe(0);
    expect(tracker.pending()).toBe(0);
  });
});
