import { describe, expect, it } from "vitest";
import { applicationIdentity, applicationsMatch } from "./appTracking";

const code = {
  name: "Code",
  processName: "Code.exe",
  executablePath: "C:\\Apps\\Code.exe",
};

describe("application tracking", () => {
  it("normalizes Windows paths for stable matching", () => {
    expect(applicationIdentity(code)).toBe("c:\\apps\\code.exe");
    expect(applicationsMatch(code, {
      ...code,
      executablePath: "c:\\APPS\\CODE.EXE",
      windowTitle: "project - Visual Studio Code",
    })).toBe(true);
  });

  it("does not match a different or missing foreground application", () => {
    expect(applicationsMatch(code, null)).toBe(false);
    expect(applicationsMatch(code, {
      name: "Chrome",
      processName: "chrome.exe",
      executablePath: "C:\\Apps\\Chrome.exe",
      windowTitle: "Chrome",
    })).toBe(false);
  });
});
