import { describe, expect, it } from "vitest";
import { AppError, toAppError, type AppErrorCode } from "../core/errors";
import { ERROR_CODES, errorMessage, messageForError } from "./messages";

const SAMPLE_DETAILS: Partial<Record<AppErrorCode, unknown>> = {
  IMAGE_TOO_LARGE: { limitBytes: 20 * 1024 * 1024 },
  IMAGE_LIMIT_REACHED: { max: 10 },
  IMAGE_LIMIT_TRUNCATED: { added: 2, max: 10 },
  DOWNLOAD_FAILED: { status: 500 },
  CLIPBOARD_COPY_FAILED: { hex: "#FFFFFF" },
  TASK_LIMIT_REACHED: { max: 6 },
  TASK_HOUR_TAKEN: { hour: 7 },
};

// The catalogue is exhaustive by type; the casts only let the test build one of each.
const sampleFor = (code: AppErrorCode) =>
  new AppError(code as never, SAMPLE_DETAILS[code] as never);

describe("error messages", () => {
  it("formats codes that carry details", () => {
    expect(messageForError(new AppError("TASK_HOUR_TAKEN", { hour: 4 })))
      .toBe("4'o is already occupied.");
    expect(messageForError(new AppError("DOWNLOAD_FAILED", { status: 404 })))
      .toBe("Image download failed (404).");
    expect(messageForError(new AppError("IMAGE_TOO_LARGE", { limitBytes: 20 * 1024 * 1024 })))
      .toBe("Each image must be smaller than 20 MB.");
  });

  it("gives one message to a rule raised from more than one place", () => {
    const fromFilePick = new AppError("IMAGE_TOO_LARGE", { limitBytes: 20 * 1024 * 1024 });
    const fromWebDownload = new AppError("IMAGE_TOO_LARGE", { limitBytes: 20 * 1024 * 1024 });

    expect(messageForError(fromFilePick)).toBe(messageForError(fromWebDownload));
  });

  it("falls back without leaking a raw throwable's message", () => {
    expect(errorMessage(new TypeError("fetch failed: ECONNREFUSED"), "ANALYSIS_FAILED"))
      .toBe("Color analysis failed.");
    expect(errorMessage("some string", "IMAGE_UNREADABLE")).toBe("An image could not be read.");
  });

  it("writes every message in sentence case", () => {
    for (const code of ERROR_CODES) {
      const message = messageForError(sampleFor(code));

      expect(message, `${code} is empty`).not.toBe("");
      expect(message, `${code} is shouting`).not.toBe(message.toUpperCase());
      expect(message[0], `${code} does not open with a capital`).toBe(message[0].toUpperCase());
    }
  });

  it("keeps an AppError's own code when one is thrown through a catch", () => {
    const thrown = new AppError("DOWNLOAD_TIMED_OUT");

    expect(toAppError(thrown, "IMAGE_IMPORT_FAILED")).toBe(thrown);
    expect(errorMessage(thrown, "IMAGE_IMPORT_FAILED")).toBe("Image download timed out.");
  });
});
