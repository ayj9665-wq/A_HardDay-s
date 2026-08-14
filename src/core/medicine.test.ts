import { describe, expect, it } from "vitest";
import { deriveMood, extractPalette, youtubeMusicSearchUrl } from "./medicine";

function pixels(colors: Array<[number, number, number, number]>) {
  return {
    width: colors.length,
    height: 1,
    data: new Uint8ClampedArray(colors.flat()),
  };
}

describe("medicine domain", () => {
  it("extracts dominant opaque colors and ignores transparent pixels", () => {
    const palette = extractPalette(pixels([
      [240, 30, 20, 255],
      [242, 32, 21, 255],
      [20, 40, 220, 255],
      [0, 255, 0, 0],
    ]));

    expect(palette).toHaveLength(2);
    expect(palette[0].r).toBeGreaterThan(230);
    expect(palette.some((color) => color.b > 200)).toBe(true);
  });

  it("derives a quiet night prescription from a dark muted palette", () => {
    const palette = extractPalette(pixels([
      [18, 22, 28, 255],
      [25, 31, 38, 255],
      [38, 42, 48, 255],
      [18, 22, 28, 255],
    ]));
    const mood = deriveMood(palette);

    expect(mood.tags).toContain("LOW LIGHT");
    expect(mood.tags).toContain("QUIET");
    expect(mood.searchQueries[0]).toContain("playlist");
  });

  it("creates an encoded YouTube Music search link", () => {
    expect(youtubeMusicSearchUrl("warm jazz mix")).toBe(
      "https://music.youtube.com/search?q=warm%20jazz%20mix",
    );
  });
});
