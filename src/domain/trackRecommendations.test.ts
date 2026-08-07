import { describe, expect, it } from "vitest";
import { deriveMood, extractPalette } from "./medicine";
import { recommendTracks } from "./trackRecommendations";

function paletteFrom(colors: Array<[number, number, number, number]>) {
  return extractPalette({
    width: colors.length,
    height: 1,
    data: new Uint8ClampedArray(colors.flat()),
  });
}

describe("track recommendations", () => {
  it("returns five unique tracks with diverse artists", () => {
    const palette = paletteFrom([
      [18, 22, 28, 255],
      [25, 31, 38, 255],
      [38, 42, 48, 255],
    ]);
    const recommendations = recommendTracks(deriveMood(palette), palette);

    expect(recommendations).toHaveLength(5);
    expect(new Set(recommendations.map((track) => track.id)).size).toBe(5);
    expect(new Set(recommendations.map((track) => track.artist)).size).toBe(5);
    expect(recommendations.every((track) => track.title && track.artist)).toBe(true);
  });

  it("is stable for the same palette", () => {
    const palette = paletteFrom([
      [225, 173, 68, 255],
      [238, 205, 126, 255],
      [121, 72, 35, 255],
    ]);
    const mood = deriveMood(palette);

    expect(recommendTracks(mood, palette).map((track) => track.id)).toEqual(
      recommendTracks(mood, palette).map((track) => track.id),
    );
  });

  it("returns no tracks when the requested limit is zero", () => {
    const mood = deriveMood([]);
    expect(recommendTracks(mood, [], 0)).toEqual([]);
  });
});
