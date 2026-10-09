import type { Bar, MarketData } from '../../domain/marketData';
import { UnsupportedExchangeError, UpstreamInvalidResponseError } from '../../domain/errors';
import { MARKET_TIME_ZONE } from '../../domain/time';
import type { YahooResult } from './wireSchema';

/**
 * Converts one Yahoo result into domain bars by zipping the parallel arrays. Throws
 * `UnsupportedExchangeError` for non-ET exchanges and `UpstreamInvalidResponseError` when the
 * quote arrays are missing or differ in length. No timestamps means no bars.
 */
export function toMarketData(result: YahooResult): MarketData {
  if (result.meta.exchangeTimezoneName !== MARKET_TIME_ZONE) {
    throw new UnsupportedExchangeError({ exchangeTimezoneName: result.meta.exchangeTimezoneName });
  }

  const timestamps = result.timestamp ?? [];
  if (timestamps.length === 0) return { bars: [] };

  const quote = result.indicators.quote[0];
  const { low, high, volume } = quote ?? {};
  if (!low || !high || !volume) {
    throw new UpstreamInvalidResponseError('missing quote arrays');
  }
  if (low.length !== timestamps.length || high.length !== timestamps.length || volume.length !== timestamps.length) {
    throw new UpstreamInvalidResponseError('quote arrays do not match timestamp length');
  }

  const bars: Bar[] = timestamps.map((timestamp, i) => ({
    timestamp,
    low: low[i] ?? null,
    high: high[i] ?? null,
    volume: volume[i] ?? null,
  }));
  return { bars };
}
