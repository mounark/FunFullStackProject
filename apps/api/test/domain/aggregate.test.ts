import { describe, expect, it } from 'vitest';
import { aggregateDailyStats } from '../../src/domain/aggregate';
import type { Bar } from '../../src/domain/marketData';

const ts = (iso: string) => Date.parse(iso) / 1000;
const bar = (iso: string, low: number | null, high: number | null, volume: number | null): Bar => ({
  timestamp: ts(iso),
  low,
  high,
  volume,
});

describe('aggregateDailyStats', () => {
  it('averages low/high and sums volume per ET day, rounded once to 4 decimals', () => {
    const { stats } = aggregateDailyStats(
      [
        bar('2026-09-01T09:30:00-04:00', 1, 2, 10),
        bar('2026-09-01T09:45:00-04:00', 2, 4, 20),
        bar('2026-09-01T10:00:00-04:00', 2, 3, 30),
      ],
      '2026-09',
    );
    expect(stats).toEqual([{ day: '2026-09-01', lowAverage: 1.6667, highAverage: 3, volume: 60 }]);
  });

  it('sorts days ascending regardless of input order', () => {
    const { stats } = aggregateDailyStats(
      [bar('2026-09-03T10:00:00-04:00', 1, 1, 1), bar('2026-09-02T10:00:00-04:00', 1, 1, 1)],
      '2026-09',
    );
    expect(stats.map((s) => s.day)).toEqual(['2026-09-02', '2026-09-03']);
  });

  it('keeps only bars whose ET date is inside the target month', () => {
    const { stats, emptyDays } = aggregateDailyStats(
      [
        bar('2026-08-31T15:45:00-04:00', 1, 1, 1),
        bar('2026-09-01T09:30:00-04:00', 2, 2, 2),
        bar('2026-10-01T09:30:00-04:00', 3, 3, 3),
        bar('2026-10-08T16:00:00-04:00', null, null, null),
      ],
      '2026-09',
    );
    expect(stats.map((s) => s.day)).toEqual(['2026-09-01']);
    expect(emptyDays).toEqual([]);
  });

  it('assigns a bar to its ET day, not its UTC day', () => {
    // 2026-10-01T03:30Z is 23:30 ET on Sept 30.
    const { stats } = aggregateDailyStats([bar('2026-10-01T03:30:00Z', 1, 1, 1)], '2026-09');
    expect(stats.map((s) => s.day)).toEqual(['2026-09-30']);
  });

  it('drops bars with null low, high or volume', () => {
    const { stats } = aggregateDailyStats(
      [
        bar('2026-09-01T09:30:00-04:00', 5, 6, 100),
        bar('2026-09-01T09:45:00-04:00', null, 9, 1),
        bar('2026-09-01T10:00:00-04:00', 1, null, 1),
        bar('2026-09-01T10:15:00-04:00', 1, 1, null),
      ],
      '2026-09',
    );
    expect(stats).toEqual([{ day: '2026-09-01', lowAverage: 5, highAverage: 6, volume: 100 }]);
  });

  it('keeps zero-volume bars with real prices', () => {
    const { stats } = aggregateDailyStats([bar('2026-09-01T09:30:00-04:00', 10.46, 10.46, 0)], '2026-09');
    expect(stats).toEqual([{ day: '2026-09-01', lowAverage: 10.46, highAverage: 10.46, volume: 0 }]);
  });

  it('omits a day with no valid bars and reports it with its dropped-bar count', () => {
    const { stats, emptyDays } = aggregateDailyStats(
      [
        bar('2026-09-25T09:30:00-04:00', null, null, null),
        bar('2026-09-25T09:45:00-04:00', null, null, null),
        bar('2026-09-28T09:30:00-04:00', 1, 2, 3),
      ],
      '2026-09',
    );
    expect(stats.map((s) => s.day)).toEqual(['2026-09-28']);
    expect(emptyDays).toEqual([{ day: '2026-09-25', droppedBars: 2 }]);
  });

  it('returns nothing for no bars', () => {
    expect(aggregateDailyStats([], '2026-09')).toEqual({ stats: [], emptyDays: [] });
  });
});
