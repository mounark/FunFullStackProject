import { describe, expect, it } from 'vitest';
import type { MarketData, MonthWindow } from '../../src/domain/marketData';
import type { MarketDataProvider } from '../../src/domain/ports';
import { InMemoryTtlCache } from '../../src/infrastructure/cache';
import { CachingMarketDataProvider } from '../../src/infrastructure/cachingProvider';

const window: MonthWindow = { month: '2026-09', period1: 1, period2: 2 };
const data: MarketData = { bars: [{ timestamp: 1, low: 1, high: 2, volume: 3 }] };

const setup = () => {
  const calls: string[] = [];
  const inner: MarketDataProvider = {
    getBars: async (symbol) => {
      calls.push(symbol);
      return data;
    },
  };
  const cache = new InMemoryTtlCache<MarketData>(1000, { now: () => new Date(0) });
  return { calls, provider: new CachingMarketDataProvider(inner, cache) };
};

describe('CachingMarketDataProvider', () => {
  it('serves the second identical request from the cache', async () => {
    const { calls, provider } = setup();
    expect(await provider.getBars('TSLA', window)).toBe(data);
    expect(await provider.getBars('TSLA', window)).toBe(data);
    expect(calls).toEqual(['TSLA']);
  });

  it('keys by symbol and month', async () => {
    const { calls, provider } = setup();
    await provider.getBars('TSLA', window);
    await provider.getBars('AAPL', window);
    await provider.getBars('TSLA', { ...window, month: '2026-10' });
    expect(calls).toEqual(['TSLA', 'AAPL', 'TSLA']);
  });

  it('does not cache failures', async () => {
    let n = 0;
    const inner: MarketDataProvider = {
      getBars: async () => {
        if (n++ === 0) throw new Error('boom');
        return data;
      },
    };
    const provider = new CachingMarketDataProvider(
      inner,
      new InMemoryTtlCache<MarketData>(1000, { now: () => new Date(0) }),
    );
    await expect(provider.getBars('TSLA', window)).rejects.toThrow('boom');
    expect(await provider.getBars('TSLA', window)).toBe(data);
  });
});
