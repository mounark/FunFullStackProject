import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DailyStatsService } from '../src/application/dailyStatsService';
import { YahooMarketDataProvider } from '../src/infrastructure/yahoo/yahooProvider';

const fixture = (path: string) =>
  readFileSync(new URL(`./fixtures/${path}`, import.meta.url), 'utf8');

const clock = { now: () => new Date('2026-10-01T12:00:00-04:00') };

describe.each([
  { name: 'tsla-2026-09', symbol: 'TSLA', expectedDays: 21, expectedWarnings: 0 },
  { name: 'cvr-2026-09', symbol: 'CVR', expectedDays: 20, expectedWarnings: 1 },
])('ground truth: $name', ({ name, symbol, expectedDays, expectedWarnings }) => {
  it('matches the expected daily stats exactly', async () => {
    const urls: string[] = [];
    const warnings: { obj: object; msg: string }[] = [];
    const logger = { warn: (obj: object, msg: string) => void warnings.push({ obj, msg }) };
    const fetchFake: typeof fetch = async (input) => {
      urls.push(String(input));
      return new Response(fixture(`yahoo/${name}.json`), { status: 200 });
    };
    const provider = new YahooMarketDataProvider({
      fetch: fetchFake,
      logger,
      timeoutMs: 5000,
      retries: 0,
      backoffMs: 0,
      sleep: async () => {},
    });
    const service = new DailyStatsService(provider, clock, logger);

    const stats = await service.getDailyStats(symbol);

    expect(stats).toEqual(JSON.parse(fixture(`expected/${name}-daily-stats.json`)));
    expect(stats).toHaveLength(expectedDays);
    expect(warnings).toHaveLength(expectedWarnings);
    const url = new URL(urls[0]!);
    expect(url.searchParams.get('period1')).toBe('1788220800');
    expect(url.searchParams.get('period2')).toBe('1790812800');
  });
});
