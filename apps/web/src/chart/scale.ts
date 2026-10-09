export interface NiceScale {
  ticks: number[];
  min: number;
  max: number;
}

/** Rounds a raw step up to 1, 2, 5 or 10 times a power of ten. */
function niceStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw));
  const fraction = raw / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** Clean axis ticks that cover [min, max]; `min`/`max` are the first and last tick. */
export function niceScale(min: number, max: number, targetTicks = 5): NiceScale {
  const span = max - min || Math.abs(max) || 1;
  const step = niceStep(span / (targetTicks - 1));
  const first = Math.floor((max === min ? min - span / 2 : min) / step) * step;
  const last = Math.ceil((max === min ? max + span / 2 : max) / step) * step;
  const count = Math.round((last - first) / step);
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((first + i * step).toFixed(10)));
  return { ticks, min: first, max: last };
}

/** A linear map from `domain` to `range`; the range may be inverted (SVG y grows downward). */
export function scaleLinear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  return (value: number) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** Which day labels to print on the x axis so they never crowd (at most `maxLabels`). */
export function xTickIndexes(count: number, maxLabels = 7): number[] {
  const every = Math.max(1, Math.ceil(count / maxLabels));
  return Array.from({ length: count }, (_, i) => i).filter((i) => i % every === 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** `points` string for a sparkline polyline in a `width` x `height` box; '' if there is no line to draw. */
export function sparklinePoints(values: number[], width: number, height: number, pad = 2): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (width - 2 * pad) / (values.length - 1);
  return values
    .map((value, i) => {
      const y = max === min ? height / 2 : height - pad - ((value - min) / (max - min)) * (height - 2 * pad);
      return `${round2(pad + i * step)},${round2(y)}`;
    })
    .join(' ');
}

/** Baseline y for a line-end label next to a dot, flipped to the other side if it would leave the plot. */
export function endLabelY(
  dotY: number,
  side: 'above' | 'below',
  bounds: { top: number; bottom: number },
): number {
  const above = dotY - 10;
  const below = dotY + 16;
  if (side === 'above') return above < bounds.top + 8 ? below : above;
  return below > bounds.bottom - 2 ? above : below;
}

/** SVG path for a column with a rounded data-end (top) and a square baseline; '' if it has no height. */
export function columnPath(x: number, top: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return '';
  const r = Math.min(radius, height, width / 2);
  const bottom = top + height;
  return [
    `M${x},${bottom}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `L${x + width - r},${top}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `L${x + width},${bottom}`,
    'Z',
  ].join(' ');
}
