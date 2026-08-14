// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { isYoutubeMusicUrl, openYoutubeMusicUrl } from "./externalLinks";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("external music links", () => {
  it("allows only secure YouTube Music URLs", () => {
    expect(isYoutubeMusicUrl("https://music.youtube.com/search?q=ambient")).toBe(true);
    expect(isYoutubeMusicUrl("https://youtube.com/watch?v=123")).toBe(false);
    expect(isYoutubeMusicUrl("https://music.youtube.com.example.com/search")).toBe(false);
    expect(isYoutubeMusicUrl("javascript:alert(1)")).toBe(false);
  });

  it("uses a new browser tab outside the Tauri runtime", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const url = "https://music.youtube.com/search?q=focus";
    await openYoutubeMusicUrl(url);
    expect(open).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
  });

  it("rejects URLs outside the configured domain with a typed code", async () => {
    await expect(openYoutubeMusicUrl("https://example.com")).rejects.toMatchObject({
      code: "MUSIC_URL_UNSUPPORTED",
    });
  });
});
