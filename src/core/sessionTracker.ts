/** How often the caller should poll `sample()`. */
export const SESSION_SAMPLE_INTERVAL_MS = 500;

export const SESSION_TRACKER_DEFAULTS = {
  /** Ceiling on a single step, so a suspended machine cannot bank hours of "work". */
  maxSampleSeconds: 1.5,
  /** Accumulate at least this much before asking the caller to commit. */
  flushAfterSeconds: 5,
  /** Drop a final remainder below this rather than writing noise to storage. */
  minimumFlushSeconds: 0.05,
} as const;

export type SessionTrackerOptions = {
  /** Monotonic milliseconds. Injected so the timing rules are testable. */
  now?: () => number;
  maxSampleSeconds?: number;
  flushAfterSeconds?: number;
  minimumFlushSeconds?: number;
};

export type SessionTracker = {
  /** Advances the clock. Returns seconds to commit, or 0 while still accumulating. */
  sample(): number;
  /** Final advance. Returns any seconds still owed, then refuses further work. */
  stop(): number;
  /** Seconds accumulated but not yet handed over. */
  pending(): number;
};

/**
 * Turns wall-clock ticks into batched work seconds. It owns no timer and no
 * state beyond its own accumulator: the caller decides when to sample and what
 * to do with the seconds it hands back.
 */
export function createSessionTracker(options: SessionTrackerOptions = {}): SessionTracker {
  const {
    now = () => performance.now(),
    maxSampleSeconds = SESSION_TRACKER_DEFAULTS.maxSampleSeconds,
    flushAfterSeconds = SESSION_TRACKER_DEFAULTS.flushAfterSeconds,
    minimumFlushSeconds = SESSION_TRACKER_DEFAULTS.minimumFlushSeconds,
  } = options;

  let last = now();
  let pending = 0;
  let stopped = false;

  const advance = () => {
    const current = now();
    const elapsed = (current - last) / 1_000;
    pending += Math.min(Math.max(elapsed, 0), maxSampleSeconds);
    last = current;
  };

  const take = () => {
    const due = pending;
    pending = 0;
    return due;
  };

  return {
    sample() {
      if (stopped) return 0;
      advance();
      return pending >= flushAfterSeconds ? take() : 0;
    },
    stop() {
      if (stopped) return 0;
      advance();
      stopped = true;
      const due = take();
      return due >= minimumFlushSeconds ? due : 0;
    },
    pending: () => pending,
  };
}
