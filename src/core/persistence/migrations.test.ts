import { describe, expect, it } from "vitest";
import { normalizeState } from "../../domain/tasks";
import { MIGRATIONS, migrateToCurrent } from "./migrations";
import { CURRENT_SCHEMA_VERSION, readEnvelope, writeEnvelope } from "./schema";

describe("stored state envelope", () => {
  it("reads state written before versioning existed as version 0", () => {
    expect(readEnvelope({ tasks: [], alwaysOnTop: true })).toEqual({
      version: 0,
      state: { tasks: [], alwaysOnTop: true },
    });
    expect(readEnvelope(null)).toEqual({ version: 0, state: null });
    expect(readEnvelope(undefined)).toEqual({ version: 0, state: undefined });
  });

  it("round-trips what it writes", () => {
    const envelope = writeEnvelope({ tasks: [] });

    expect(envelope.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(readEnvelope(envelope)).toEqual({
      version: CURRENT_SCHEMA_VERSION,
      state: { tasks: [] },
    });
  });

  it("does not mistake a bare state that happens to have a version field", () => {
    expect(readEnvelope({ version: 1 })).toEqual({ version: 0, state: { version: 1 } });
    expect(readEnvelope({ version: "1", state: {} })).toEqual({
      version: 0,
      state: { version: "1", state: {} },
    });
  });
});

describe("schema migrations", () => {
  it("is ordered and free of duplicate versions", () => {
    const versions = MIGRATIONS.map((migration) => migration.to);

    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(Math.max(...versions, 0)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("folds the retired transparent background flags into backgroundMode", () => {
    expect(migrateToCurrent({ backgroundTransparent: true })).toEqual({ backgroundMode: "clear" });
    expect(migrateToCurrent({ backgroundMode: "glass" })).toEqual({ backgroundMode: "clear" });
    expect(migrateToCurrent({ backgroundTransparent: false })).toEqual({
      backgroundMode: undefined,
    });
  });

  it("still lands a real pre-versioning payload on usable state", () => {
    const legacy = {
      tasks: [{ id: "a", text: "Poster", hourSlot: 3, tapeVariant: 2 }],
      activeTaskId: "a",
      backgroundTransparent: true,
      alwaysOnTop: true,
    };

    const state = normalizeState(migrateToCurrent(legacy));

    expect(state.backgroundMode).toBe("clear");
    expect(state.alwaysOnTop).toBe(true);
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].text).toBe("Poster");
    expect(state.tasks[0].linkedApplications).toEqual([]);
  });

  it("leaves already-current state alone", () => {
    const current = writeEnvelope({ backgroundMode: "clear", alwaysOnTop: false });

    expect(migrateToCurrent(current)).toEqual({ backgroundMode: "clear", alwaysOnTop: false });
  });

  it("passes through state written by a newer build", () => {
    const fromTheFuture = { version: CURRENT_SCHEMA_VERSION + 5, state: { backgroundMode: "clear" } };

    expect(migrateToCurrent(fromTheFuture)).toEqual({ backgroundMode: "clear" });
  });

  it("survives data that is not an object at all", () => {
    expect(migrateToCurrent(null)).toBeNull();
    expect(migrateToCurrent("corrupt")).toBe("corrupt");
    expect(normalizeState(migrateToCurrent([1, 2, 3])).tasks).toEqual([]);
  });
});
