/**
 * The prescriptions the color analysis can produce. Both the analyzer and the
 * track catalogue key off this union, so a renamed mood breaks the build
 * instead of silently dropping every track to the fallback score.
 */
export const MOOD_IDS = [
  "open-prescription",
  "clear-focus",
  "midnight-focus",
  "dark-current",
  "golden-pause",
  "sunlit-motion",
  "blue-hour",
  "color-rush",
] as const;

export type MoodId = (typeof MOOD_IDS)[number];
