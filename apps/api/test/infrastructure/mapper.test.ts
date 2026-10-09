import { describe, expect, it } from 'vitest';
import { UnsupportedExchangeError, UpstreamInvalidResponseError } from '../../src/domain/errors';
import { toMarketData } from '../../src/infrastructure/yahoo/mapper';
import type { YahooResult } from '../../src/infrastructure/yahoo/wireSchema';

const result = (over: Partial<YahooResult> = {}): YahooResult => ({
  meta: { exchangeTimezoneName: 'America/New_York' },
  timestamp: [100, 200],
  indicators: { quote: [{ low: [1, null], high: [2, 3], volume: [10, 20] }] },
  ...over,
});

describe('toMarketData', () => {
  it('zips the parallel arrays into bars, preserving nulls', () => {
    expect(toMarketData(result()).bars).toEqual([
      { timestamp: 100, low: 1, high: 2, volume: 10 },
      { timestamp: 200, low: null, high: 3, volume: 20 },
    ]);
  });

  it('rejects a non-ET exchange', () => {
    expect(() =>
      toMarketData(result({ meta: { exchangeTimezoneName: 'Europe/London' } })),
    ).toThrow(UnsupportedExchangeError);
  });

  it.each([
    ['low', { low: [1], high: [2, 3], volume: [10, 20] }],
    ['high', { low: [1, 2], high: [2], volume: [10, 20] }],
    ['volume', { low: [1, 2], high: [2, 3], volume: [10] }],
  ])('rejects mismatched %s length', (_name, quote) => {
    expect(() => toMarketData(result({ indicators: { quote: [quote] } }))).toThrow(
      UpstreamInvalidResponseError,
    );
  });

  it('rejects timestamps without quote arrays', () => {
    expect(() => toMarketData(result({ indicators: { quote: [{}] } }))).toThrow(
      UpstreamInvalidResponseError,
    );
    expect(() => toMarketData(result({ indicators: { quote: [] } }))).toThrow(
      UpstreamInvalidResponseError,
    );
  });

  it.each([[undefined], [[]]])('yields no bars when timestamp is %j', (timestamp) => {
    const r = result({ indicators: { quote: [{}] } });
    expect(toMarketData({ ...r, timestamp }).bars).toEqual([]);
  });
});
