import { clamp } from "../core/math";
import { TRACK_CATALOG, type RecommendationTrack } from "../data/trackCatalog";
import type { MoodProfile, PaletteColor } from "./medicine";

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function paletteSeed(palette: PaletteColor[]) {
  return palette
    .map((color) => `${color.hex}:${Math.round(color.weight * 1000)}`)
    .join("|");
}

function similarity(first: number, second: number, range = 1) {
  return clamp(1 - Math.abs(first - second) / range);
}

function trackScore(track: RecommendationTrack, mood: MoodProfile, seed: string) {
  const moodAffinity = track.moods.includes(mood.id)
    ? 1
    : track.moods.includes("clear-focus") || track.moods.includes("open-prescription")
      ? .62
      : .34;
  const focusTarget = clamp(1 - mood.energy * .35);
  const instrumentalAffinity = track.instrumental ? 1 : .52;
  const stableVariation = (hash(`${seed}:${track.id}`) % 10_000) / 10_000;

  return moodAffinity * .30
    + similarity(track.energy, mood.energy) * .25
    + similarity(track.lightness, mood.lightness) * .15
    + similarity(track.warmth, mood.warmth, 2) * .15
    + (similarity(track.focus, focusTarget) * .65 + instrumentalAffinity * .35) * .10
    + similarity(track.contrast, mood.contrast) * .05
    + stableVariation * .012;
}

export function recommendTracks(
  mood: MoodProfile,
  palette: PaletteColor[],
  limit = 5,
): RecommendationTrack[] {
  if (limit <= 0) return [];

  const seed = paletteSeed(palette) || mood.id;
  const ranked = [...TRACK_CATALOG].sort((first, second) => {
    const difference = trackScore(second, mood, seed) - trackScore(first, mood, seed);
    return difference || first.id.localeCompare(second.id);
  });
  const selected: RecommendationTrack[] = [];
  const artists = new Set<string>();
  const genreCounts = new Map<string, number>();

  for (const candidate of ranked) {
    const primaryGenre = candidate.genres[0];
    if (artists.has(candidate.artist) || (genreCounts.get(primaryGenre) ?? 0) >= 2) continue;
    selected.push(candidate);
    artists.add(candidate.artist);
    genreCounts.set(primaryGenre, (genreCounts.get(primaryGenre) ?? 0) + 1);
    if (selected.length === limit) return selected;
  }

  for (const candidate of ranked) {
    if (selected.some((track) => track.id === candidate.id)) continue;
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}
