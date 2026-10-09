import type { MarketData, MonthWindow } from '../domain/marketData';
import type { Cache, MarketDataProvider } from '../domain/ports';

/** Decorator that serves repeat requests for the same symbol and month from a cache. */
export class CachingMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly inner: MarketDataProvider,
    private readonly cache: Cache<MarketData>,
  ) {}

  /** Cache hit returns the stored data; a miss calls the wrapped provider and stores the result. Failures are not cached. */
  async getBars(symbol: string, window: MonthWindow): Promise<MarketData> {
    const key = `${symbol}:${window.month}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const data = await this.inner.getBars(symbol, window);
    this.cache.set(key, data);
    return data;
  }
}
