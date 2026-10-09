import type { DailyStat } from '@takehome/shared';
import type { Bar } from './marketData';
import { etDay } from './time';

/** A day in the month whose bars were all dropped, so it is omitted from the output. */
export interface EmptyDay {
  day: string;
  droppedBars: number;
}

/** Result of aggregation: the stats to return plus the days the caller should log. */
export interface Aggregation {
  stats: DailyStat[];
  emptyDays: EmptyDay[];
}

/** Running sums for one day while bars are being folded in. */
interface Totals {
  count: number;
  low: number;
  high: number;
  volume: number;
  dropped: number;
}

/** Rounds once, at the end, to 4 decimals. */
const round4 = (x: number) => Number(x.toFixed(4));

/**
 * Groups bars by America/New_York date, keeps only days inside `month` (YYYY-MM), drops bars with
 * a null low/high/volume, and returns per-day averages and volume sorted by day. Days left with no
 * valid bars are reported in `emptyDays` and left out of `stats`. Pure: no logging or I/O.
 */
export function aggregateDailyStats(bars: Bar[], month: string): Aggregation {
  const days = new Map<string, Totals>();

  for (const bar of bars) {
    const day = etDay(bar.timestamp);
    if (!day.startsWith(`${month}-`)) continue;
    const totals = days.get(day) ?? { count: 0, low: 0, high: 0, volume: 0, dropped: 0 };
    days.set(day, totals);
    if (bar.low === null || bar.high === null || bar.volume === null) {
      totals.dropped += 1;
      continue;
    }
    totals.count += 1;
    totals.low += bar.low;
    totals.high += bar.high;
    totals.volume += bar.volume;
  }

  const stats: DailyStat[] = [];
  const emptyDays: EmptyDay[] = [];
  for (const [day, t] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    if (t.count === 0) {
      emptyDays.push({ day, droppedBars: t.dropped });
      continue;
    }
    stats.push({
      day,
      lowAverage: round4(t.low / t.count),
      highAverage: round4(t.high / t.count),
      volume: t.volume,
    });
  }
  return { stats, emptyDays };
}
