import { describe, expect, it } from 'vitest';
import { summarize } from '../src/summary';
import { sampleStats } from './fixtures';

describe('summarize', () => {
  it('counts days, averages the daily lows and highs, and totals the volume', () => {
    const summary = summarize(sampleStats);
    expect(summary.tradingDays).toBe(3);
    expect(summary.averageLow).toBeCloseTo((356.1709 + 357.5 + 355) / 3, 10);
    expect(summary.averageHigh).toBeCloseTo((358.0532 + 360 + 359.25) / 3, 10);
    expect(summary.totalVolume).toBe(51404037);
  });
});
