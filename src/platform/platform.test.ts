// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { getPlatform, setPlatform } from ".";
import { detectOperatingSystem } from "./os";
import { webPlatform } from "./web";

afterEach(() => {
  setPlatform(null);
  delete window.__TAURI_INTERNALS__;
});

describe("platform selection", () => {
  it("uses the web platform when the Tauri runtime is absent", () => {
    expect(getPlatform()).toBe(webPlatform);
    expect(getPlatform().kind).toBe("web");
  });

  it("detects the runtime once and reuses that decision", () => {
    const first = getPlatform();
    window.__TAURI_INTERNALS__ = {};
    expect(getPlatform()).toBe(first);
  });

  it("reports desktop-only capabilities as unsupported instead of failing", async () => {
    const platform = getPlatform();

    await expect(platform.applications.isSupported()).resolves.toBe(false);
    expect(platform.window.supported).toBe(false);
    await expect(platform.applications.listRunning()).resolves.toEqual([]);
    await expect(platform.applications.getForeground()).resolves.toBeNull();
    await expect(platform.window.setAlwaysOnTop(true)).resolves.toBeUndefined();
  });

  it("hands back a working unsubscribe even where nothing can be watched", async () => {
    const calls: unknown[] = [];
    const stop = await getPlatform().applications.onForegroundChange((application) => {
      calls.push(application);
    });

    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
    expect(calls).toEqual([]);
  });

  it("reads the operating system off the user agent", () => {
    expect(detectOperatingSystem("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("macos");
    expect(detectOperatingSystem("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(detectOperatingSystem("Mozilla/5.0 (X11; Linux x86_64)")).toBe("other");
  });

  it("round-trips state through browser storage", async () => {
    const platform = getPlatform();
    await platform.storage.write("a-key", { tasks: [] });

    expect(await platform.storage.read("a-key")).toEqual({ tasks: [] });
    expect(await platform.storage.read("missing-key")).toBeUndefined();
  });

  it("ignores unreadable stored state", async () => {
    localStorage.setItem("broken-key", "{not json");
    expect(await getPlatform().storage.read("broken-key")).toBeUndefined();
  });
});
