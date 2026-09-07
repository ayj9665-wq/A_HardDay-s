import { describe, expect, it } from "vitest";
import { isDeleteKey, modifierLabel } from "./shortcuts";

describe("shortcut labels", () => {
  it("names the modifier the keyboard actually has", () => {
    expect(modifierLabel("macos")).toBe("⌘");
    expect(modifierLabel("windows")).toBe("Ctrl");
    expect(modifierLabel("other")).toBe("Ctrl");
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
