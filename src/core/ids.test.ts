import { afterEach, describe, expect, it, vi } from "vitest";
import { createId } from "./ids";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("createId", () => {
  it("returns distinct v4 ids", () => {
    expect(createId()).toMatch(UUID);
    expect(createId()).not.toBe(createId());
  });

  it("still returns an id where randomUUID is missing", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    expect(createId()).toMatch(UUID);
    expect(createId()).not.toBe(createId());
  });
});
