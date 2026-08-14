/** Shared by the color analyzer, the recommender, and layer dragging. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
