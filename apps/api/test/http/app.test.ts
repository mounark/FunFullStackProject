import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { loadConfig } from '../../src/config';
import { SymbolNotFoundError, UpstreamRateLimitedError } from '../../src/domain/errors';
import type { MarketData } from '../../src/domain/marketData';
import type { MarketDataProvider } from '../../src/domain/ports';

const clock = { now: () => new Date('2026-10-01T12:00:00-04:00') };
const config = loadConfig({ LOG_LEVEL: 'silent' });
const t = (iso: string) => Date.parse(iso) / 1000;

const appWith = (getBars: MarketDataProvider['getBars']) =>
  buildApp({ config, clock, provider: { getBars } });

const data: MarketData = {
  bars: [{ timestamp: t('2026-09-01T09:30:00-04:00'), low: 1, high: 2, volume: 3 }],
};

describe('GET /api/stocks/:symbol/daily-stats', () => {
  it('returns the stats as plain JSON, normalizing the symbol', async () => {
    const seen: string[] = [];
    const app = await appWith(async (symbol) => {
      seen.push(symbol);
      return data;
    });
    const res = await app.inject('/api/stocks/%20tsla%20/daily-stats');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json()).toEqual([{ day: '2026-09-01', lowAverage: 1, highAverage: 2, volume: 3 }]);
    expect(seen).toEqual(['TSLA']);
  });

  it('responds 200 with [] when there is no usable data', async () => {
    const app = await appWith(async () => ({ bars: [] }));
    const res = await app.inject('/api/stocks/TSLA/daily-stats');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('rejects an invalid symbol with 400 problem+json and never calls the provider', async () => {
    let called = false;
    const app = await appWith(async () => {
      called = true;
      return data;
    });
    const res = await app.inject('/api/stocks/%5EGSPC/daily-stats');
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.json()).toMatchObject({ status: 400, code: 'INVALID_SYMBOL' });
    expect(called).toBe(false);
  });

  it.each([
    [new SymbolNotFoundError(), 404, 'SYMBOL_NOT_FOUND'],
    [new UpstreamRateLimitedError(), 503, 'UPSTREAM_RATE_LIMITED'],
  ])('maps %s to %i %s', async (error, status, code) => {
    const app = await appWith(async () => {
      throw error;
    });
    const res = await app.inject('/api/stocks/TSLA/daily-stats');
    expect(res.statusCode).toBe(status);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.json()).toMatchObject({ status, code });
  });

  it('never leaks upstream details', async () => {
    const app = await appWith(async () => {
      throw new UpstreamRateLimitedError(new Error('secret upstream body'));
    });
    const res = await app.inject('/api/stocks/TSLA/daily-stats');
    expect(res.body).not.toContain('secret');
  });

  it('turns unexpected errors into a generic 500 problem', async () => {
    const app = await appWith(async () => {
      throw new Error('kaboom');
    });
    const res = await app.inject('/api/stocks/TSLA/daily-stats');
    expect(res.statusCode).toBe(500);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.json()).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect(res.body).not.toContain('kaboom');
  });
});
