// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setPlatform } from "../../platform";
import { webPlatform } from "../../platform/web";
import { STORAGE_KEY, loadAppState, saveAppState } from ".";
import { CURRENT_SCHEMA_VERSION } from "./schema";

/** Runs against the real browser adapter rather than a hand-written stub. */
beforeEach(() => {
  setPlatform(webPlatform);
  localStorage.clear();
});

afterEach(() => setPlatform(null));

const readRaw = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

describe("app state persistence", () => {
  it("gives usable state when nothing has been stored yet", async () => {
    const state = await loadAppState();

    expect(state.tasks).toEqual([]);
    expect(state.activeTaskId).toBeNull();
    expect(state.backgroundMode).toBe("solid");
  });

  it("upgrades a payload written before versioning existed", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: [{ id: "a", text: "Poster", hourSlot: 3, tapeVariant: 2 }],
      activeTaskId: "a",
      backgroundTransparent: true,
      alwaysOnTop: true,
    }));

    const state = await loadAppState();

    expect(state.backgroundMode).toBe("clear");
    expect(state.alwaysOnTop).toBe(true);
    expect(state.tasks[0].text).toBe("Poster");
  });

  it("stamps a version on everything it writes", async () => {
    await saveAppState({
      tasks: [],
      activeTaskId: null,
      backgroundMode: "clear",
      alwaysOnTop: true,
    });

    expect(readRaw().version).toBe(CURRENT_SCHEMA_VERSION);
    expect(readRaw().state.backgroundMode).toBe("clear");
  });

  it("round-trips through save and load", async () => {
    const state = await loadAppState();
    await saveAppState({ ...state, backgroundMode: "clear", alwaysOnTop: true });

    const reloaded = await loadAppState();

    expect(reloaded.backgroundMode).toBe("clear");
    expect(reloaded.alwaysOnTop).toBe(true);
  });

  it("migrates a legacy payload exactly once, not on every load", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ backgroundTransparent: true }));

    const first = await loadAppState();
    await saveAppState(first);
    const second = await loadAppState();

    expect(readRaw().version).toBe(CURRENT_SCHEMA_VERSION);
    expect(readRaw().state).not.toHaveProperty("backgroundTransparent");
    expect(second.backgroundMode).toBe("clear");
  });

  it("falls back to defaults when the stored value is corrupt", async () => {
    localStorage.setItem(STORAGE_KEY, "{not json");

    await expect(loadAppState()).resolves.toMatchObject({ tasks: [], backgroundMode: "solid" });
  });
});
