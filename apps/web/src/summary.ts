import type { DailyStat } from '@takehome/shared';

export interface Summary {
  tradingDays: number;
  averageLow: number;
  averageHigh: number;
  totalVolume: number;
}

/** Month-level figures for the tiles: the mean of the daily averages, and the summed volume. */
export function summarize(stats: DailyStat[]): Summary {
  const days = stats.length;
  const sum = (pick: (stat: DailyStat) => number) => stats.reduce((total, stat) => total + pick(stat), 0);
  return {
    tradingDays: days,
    averageLow: sum((s) => s.lowAverage) / days,
    averageHigh: sum((s) => s.highAverage) / days,
    totalVolume: sum((s) => s.volume),
  };
}
