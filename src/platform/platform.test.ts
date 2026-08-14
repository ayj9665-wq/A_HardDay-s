// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { getPlatform, setPlatform } from ".";
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

    expect(platform.applications.supported).toBe(false);
    expect(platform.window.supported).toBe(false);
    await expect(platform.applications.listRunning()).resolves.toEqual([]);
    await expect(platform.applications.getForeground()).resolves.toBeNull();
    await expect(platform.window.setAlwaysOnTop(true)).resolves.toBeUndefined();
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
