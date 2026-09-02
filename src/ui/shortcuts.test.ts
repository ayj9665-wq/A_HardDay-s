import { describe, expect, it } from "vitest";
import { isDeleteKey, modifierLabel } from "./shortcuts";

describe("shortcut labels", () => {
  it("names the modifier the keyboard actually has", () => {
    expect(modifierLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("⌘");
    expect(modifierLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Ctrl");
  });
});

describe("delete keys", () => {
  it("accepts both keys people press to delete", () => {
    expect(isDeleteKey("Delete")).toBe(true);
    expect(isDeleteKey("Backspace")).toBe(true);
  });

  it("ignores everything else", () => {
    expect(isDeleteKey("Enter")).toBe(false);
    expect(isDeleteKey("d")).toBe(false);
  });
});
