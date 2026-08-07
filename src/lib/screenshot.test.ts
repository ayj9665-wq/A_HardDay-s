import { describe, expect, it } from "vitest";
import { formatScreenshotFileName } from "./screenshot";

describe("screenshot export", () => {
  it("creates a Windows-safe PNG file name containing the current view", () => {
    const fileName = formatScreenshotFileName(
      "medicine",
      new Date("2026-08-07T08:09:10.123Z"),
    );

    expect(fileName).toBe("a-hard-days-medicine-2026-08-07T08-09-10-123Z.png");
    expect(fileName).not.toMatch(/[<>:"/\\|?*]/);
  });
});
