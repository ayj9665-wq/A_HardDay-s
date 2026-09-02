import { describe, expect, it } from "vitest";
import { applicationIdentity, applicationsMatch } from "./applications";

const code = {
  name: "Code",
  processName: "Code.exe",
  executablePath: "C:\\Apps\\Code.exe",
};

const safari = {
  name: "Safari",
  processName: "Safari.app",
  executablePath: "/Applications/Safari.app",
};

describe("application tracking", () => {
  it("normalizes Windows paths for stable matching", () => {
    expect(applicationIdentity(code)).toBe("c:\\apps\\code.exe");
    expect(applicationsMatch(code, {
      ...code,
      executablePath: "c:\\APPS\\CODE.EXE",
      detail: "project - Visual Studio Code",
    })).toBe(true);
  });

  it("matches macOS bundle paths the same way", () => {
    expect(applicationIdentity(safari)).toBe("/applications/safari.app");
    expect(applicationsMatch(safari, {
      ...safari,
      executablePath: " /Applications/Safari.app ",
      detail: "com.apple.Safari",
    })).toBe(true);
  });

  it("keeps two applications in the same macOS folder apart", () => {
    expect(applicationsMatch(safari, {
      name: "Notes",
      processName: "Notes.app",
      executablePath: "/Applications/Notes.app",
      detail: "com.apple.Notes",
    })).toBe(false);
  });

  it("does not match a different or missing foreground application", () => {
    expect(applicationsMatch(code, null)).toBe(false);
    expect(applicationsMatch(code, {
      name: "Chrome",
      processName: "chrome.exe",
      executablePath: "C:\\Apps\\Chrome.exe",
      detail: "Chrome",
    })).toBe(false);
  });
});
