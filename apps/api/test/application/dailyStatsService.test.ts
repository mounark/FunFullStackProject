import { describe, expect, it } from 'vitest';
import { DailyStatsService } from '../../src/application/dailyStatsService';
import { UpstreamUnavailableError } from '../../src/domain/errors';
import type { MarketData, MonthWindow } from '../../src/domain/marketData';
import type { MarketDataProvider } from '../../src/domain/ports';

const clock = { now: () => new Date('2026-10-01T12:00:00-04:00') };
const t = (iso: string) => Date.parse(iso) / 1000;

const setup = (data: MarketData) => {
  const requests: { symbol: string; window: MonthWindow }[] = [];
  const warnings: { obj: object; msg: string }[] = [];
  const provider: MarketDataProvider = {
    getBars: async (symbol, window) => {
      requests.push({ symbol, window });
      return data;
    },
  };
  const service = new DailyStatsService(provider, clock, { warn: (obj, msg) => void warnings.push({ obj, msg }) });
  return { service, requests, warnings };
};

describe('DailyStatsService', () => {
  it('asks the provider for the previous month and aggregates the result', async () => {
    const { service, requests } = setup({
      bars: [{ timestamp: t('2026-09-01T09:30:00-04:00'), low: 1, high: 2, volume: 3 }],
    });
    expect(await service.getDailyStats('TSLA')).toEqual([
      { day: '2026-09-01', lowAverage: 1, highAverage: 2, volume: 3 },
    ]);
    expect(requests).toEqual([
      { symbol: 'TSLA', window: { month: '2026-09', period1: 1788220800, period2: 1790812800 } },
    ]);
  });

  it('logs each day with no valid bars once at warn level', async () => {
    const { service, warnings } = setup({
      bars: [
        { timestamp: t('2026-09-25T09:30:00-04:00'), low: null, high: null, volume: null },
        { timestamp: t('2026-09-25T09:45:00-04:00'), low: null, high: null, volume: null },
      ],
    });
    expect(await service.getDailyStats('CVR')).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.obj).toMatchObject({ symbol: 'CVR', day: '2026-09-25', droppedBars: 2 });
  });

  it('lets provider errors through untouched', async () => {
    const provider: MarketDataProvider = {
      getBars: async () => {
        throw new UpstreamUnavailableError();
      },
    };
    const service = new DailyStatsService(provider, clock, { warn: () => {} });
    await expect(service.getDailyStats('TSLA')).rejects.toThrow(UpstreamUnavailableError);
  });
});
