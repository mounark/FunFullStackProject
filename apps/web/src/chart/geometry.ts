/** Shared layout of the SVG charts: a fixed viewBox that scales to the card width. */
export const WIDTH = 720;
export const HEIGHT = 280;

export const PLOT = { left: 56, right: WIDTH - 16, top: 12, bottom: HEIGHT - 28 };

/** Horizontal space given to each day. */
export const bandWidth = (count: number) => (PLOT.right - PLOT.left) / Math.max(count, 1);

/** X of the center of day `index` of `count`. */
export const xCenter = (index: number, count: number) => PLOT.left + (index + 0.5) * bandWidth(count);

/** The day nearest to viewBox x, clamped to the plot. */
export function indexAtX(x: number, count: number): number {
  const index = Math.floor((x - PLOT.left) / bandWidth(count));
  return Math.max(0, Math.min(count - 1, index));
}
