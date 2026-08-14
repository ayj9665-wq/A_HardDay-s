import type { MoodId } from "../core/moods";

/** Display names for prescriptions. The analyzer works in ids; only this maps to words. */
const MOOD_LABELS: Record<MoodId, string> = {
  "open-prescription": "OPEN PRESCRIPTION",
  "clear-focus": "CLEAR FOCUS",
  "midnight-focus": "MIDNIGHT FOCUS",
  "dark-current": "DARK CURRENT",
  "golden-pause": "GOLDEN PAUSE",
  "sunlit-motion": "SUNLIT MOTION",
  "blue-hour": "BLUE HOUR",
  "color-rush": "COLOR RUSH",
};

export function moodLabel(id: MoodId): string {
  return MOOD_LABELS[id];
}
