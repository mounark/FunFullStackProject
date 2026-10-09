import { describe, expect, it } from 'vitest';
import { bandWidth, indexAtX, PLOT, xCenter } from '../src/chart/geometry';
import { columnPath, endLabelY, niceScale, scaleLinear, sparklinePoints, xTickIndexes } from '../src/chart/scale';

describe('niceScale', () => {
  it('rounds to clean tick values covering the data', () => {
    expect(niceScale(0, 100)).toEqual({ ticks: [0, 50, 100], min: 0, max: 100 });
    expect(niceScale(356.1, 358.05).ticks).toEqual([356, 356.5, 357, 357.5, 358, 358.5]);
  });

  it('widens a flat series so the scale is not degenerate', () => {
    const { ticks, min, max } = niceScale(10, 10);
    expect(min).toBeLessThan(10);
    expect(max).toBeGreaterThan(10);
    expect(ticks.length).toBeGreaterThan(1);
  });

  it('handles an all-zero series', () => {
    const { min, max } = niceScale(0, 0);
    expect(max).toBeGreaterThan(min);
  });
});

describe('scaleLinear', () => {
  it('maps the domain onto the range, including inverted ranges', () => {
    const y = scaleLinear([0, 10], [100, 0]);
    expect(y(0)).toBe(100);
    expect(y(10)).toBe(0);
    expect(y(5)).toBe(50);
  });
});

describe('xTickIndexes', () => {
  it('labels every day when there are few', () => {
    expect(xTickIndexes(3)).toEqual([0, 1, 2]);
  });
  it('thins labels for a full month', () => {
    expect(xTickIndexes(21)).toEqual([0, 3, 6, 9, 12, 15, 18]);
  });
  it('returns nothing for no days', () => {
    expect(xTickIndexes(0)).toEqual([]);
  });
});

describe('geometry', () => {
  it('centers each day in its band', () => {
    expect(xCenter(0, 2)).toBe(PLOT.left + bandWidth(2) / 2);
    expect(xCenter(1, 2)).toBe(PLOT.left + bandWidth(2) * 1.5);
  });

  it('finds the nearest day for a pointer x, clamped to the plot', () => {
    expect(indexAtX(PLOT.left + 100, 2)).toBe(0);
    expect(indexAtX(PLOT.left + bandWidth(2) + 100, 2)).toBe(1);
    expect(indexAtX(0, 2)).toBe(0);
    expect(indexAtX(10_000, 2)).toBe(1);
  });
});

describe('columnPath', () => {
  it('draws nothing for a zero-height bar', () => {
    expect(columnPath(0, 100, 10, 0)).toBe('');
  });
  it('draws a closed path for a visible bar', () => {
    expect(columnPath(0, 50, 10, 50)).toMatch(/^M.*Z$/);
  });
});

describe('sparklinePoints', () => {
  it('maps values into the box, higher values nearer the top', () => {
    expect(sparklinePoints([0, 10], 100, 20)).toBe('2,18 98,2');
  });
  it('draws a flat series through the middle', () => {
    expect(sparklinePoints([5, 5, 5], 100, 20)).toBe('2,10 50,10 98,10');
  });
  it('needs at least two points', () => {
    expect(sparklinePoints([5], 100, 20)).toBe('');
    expect(sparklinePoints([], 100, 20)).toBe('');
  });
});

describe('endLabelY', () => {
  const bounds = { top: 0, bottom: 200 };
  it('puts a label on its requested side of the dot', () => {
    expect(endLabelY(100, 'above', bounds)).toBe(90);
    expect(endLabelY(100, 'below', bounds)).toBe(116);
  });
  it('flips to the other side rather than leave the plot', () => {
    expect(endLabelY(5, 'above', bounds)).toBe(21);
    expect(endLabelY(198, 'below', bounds)).toBe(188);
  });
});
