import { describe, expect, it } from 'vitest';
import {
  SymbolNotFoundError,
  UnsupportedExchangeError,
  UpstreamInvalidResponseError,
  UpstreamRangeUnavailableError,
  UpstreamRateLimitedError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from '../../src/domain/errors';
import type { MonthWindow } from '../../src/domain/marketData';
import { YahooMarketDataProvider } from '../../src/infrastructure/yahoo/yahooProvider';

const window: MonthWindow = { month: '2026-09', period1: 1788220800, period2: 1790812800 };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const okBody = {
  chart: {
    result: [
      {
        meta: { exchangeTimezoneName: 'America/New_York' },
        timestamp: [1788269400],
        indicators: { quote: [{ low: [1], high: [2], volume: [3] }] },
      },
    ],
    error: null,
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

type FetchFn = typeof fetch;
type Call = { url: string; headers: Headers };

const setup = (respond: (call: number, init: RequestInit | undefined) => Response | Promise<Response>, opts: { retries?: number; timeoutMs?: number } = {}) => {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const fetchFake: FetchFn = async (input, init) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    return respond(calls.length, init);
  };
  const provider = new YahooMarketDataProvider({
    fetch: fetchFake,
    logger: { warn: () => {} },
    timeoutMs: opts.timeoutMs ?? 50,
    retries: opts.retries ?? 1,
    backoffMs: 100,
    sleep: async (ms) => void sleeps.push(ms),
  });
  return { provider, calls, sleeps };
};

describe('YahooMarketDataProvider', () => {
  it('requests the chart URL with 15m interval, exact periods and the hardcoded User-Agent', async () => {
    const { provider, calls } = setup(() => json(okBody));
    const data = await provider.getBars('BRK-B', window);
    expect(data.bars).toEqual([{ timestamp: 1788269400, low: 1, high: 2, volume: 3 }]);
    const url = new URL(calls[0]!.url);
    expect(url.origin + url.pathname).toBe('https://query1.finance.yahoo.com/v8/finance/chart/BRK-B');
    expect(url.searchParams.get('interval')).toBe('15m');
    expect(url.searchParams.get('period1')).toBe('1788220800');
    expect(url.searchParams.get('period2')).toBe('1790812800');
    expect(url.searchParams.has('includePrePost')).toBe(false);
    expect(calls[0]!.headers.get('user-agent')).toBe(UA);
  });

  it('URL-encodes the symbol', async () => {
    const { provider, calls } = setup(() => json(okBody));
    await provider.getBars('A/B', window);
    expect(new URL(calls[0]!.url).pathname).toBe('/v8/finance/chart/A%2FB');
  });

  it('maps 429 to rate-limited without parsing the body, and does not retry', async () => {
    const { provider, calls } = setup(() => new Response('Too Many Requests', { status: 429 }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamRateLimitedError);
    expect(calls).toHaveLength(1);
  });

  it('maps 404 to symbol-not-found, and does not retry', async () => {
    const body = { chart: { result: null, error: { code: 'Not Found', description: 'No data found, symbol may be delisted' } } };
    const { provider, calls } = setup(() => json(body, 404));
    await expect(provider.getBars('ZZZZ', window)).rejects.toThrow(SymbolNotFoundError);
    expect(calls).toHaveLength(1);
  });

  it('maps 422 to range-unavailable, and does not retry', async () => {
    const body = {
      chart: {
        result: null,
        error: { code: 'Unprocessable Entity', description: '15m data not available for startTime=1 and endTime=2. The requested range must be within the last 60 days.' },
      },
    };
    const { provider, calls } = setup(() => json(body, 422));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamRangeUnavailableError);
    expect(calls).toHaveLength(1);
  });

  it('maps an unexpected 4xx to invalid-response, and does not retry', async () => {
    const { provider, calls } = setup(() => new Response('nope', { status: 403 }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamInvalidResponseError);
    expect(calls).toHaveLength(1);
  });

  it('retries a 5xx once after a fixed backoff, then succeeds', async () => {
    const { provider, calls, sleeps } = setup((n) => (n === 1 ? new Response('', { status: 503 }) : json(okBody)));
    await expect(provider.getBars('TSLA', window)).resolves.toBeDefined();
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([100]);
  });

  it('gives up after one retry on persistent 5xx', async () => {
    const { provider, calls } = setup(() => new Response('', { status: 500 }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamUnavailableError);
    expect(calls).toHaveLength(2);
  });

  it('retries a network error once, then maps it to unavailable', async () => {
    const { provider, calls } = setup(() => {
      throw new TypeError('fetch failed');
    });
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamUnavailableError);
    expect(calls).toHaveLength(2);
  });

  it('maps a timeout to UpstreamTimeoutError after retrying', async () => {
    const hang = (_n: number, init: RequestInit | undefined) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const { provider, calls } = setup(hang, { timeoutMs: 5 });
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamTimeoutError);
    expect(calls).toHaveLength(2);
  });

  it('honors retries=0', async () => {
    const { provider, calls } = setup(() => new Response('', { status: 500 }), { retries: 0 });
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamUnavailableError);
    expect(calls).toHaveLength(1);
  });

  it('maps a non-JSON 2xx to invalid-response', async () => {
    const { provider } = setup(() => new Response('<html>hi</html>', { status: 200 }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamInvalidResponseError);
  });

  it('maps truncated JSON to invalid-response', async () => {
    const { provider } = setup(() => new Response('{"chart":{"result":[{"meta":', { status: 200 }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamInvalidResponseError);
  });

  it('maps a schema failure to invalid-response', async () => {
    const { provider } = setup(() => json({ chart: { result: [{ meta: {} }], error: null } }));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(UpstreamInvalidResponseError);
  });

  it.each([
    ['chart.error on a 200', { chart: { result: null, error: { code: 'Not Found', description: 'x' } } }],
    ['an empty result', { chart: { result: [], error: null } }],
    ['a null result', { chart: { result: null, error: null } }],
  ])('maps %s to symbol-not-found', async (_name, body) => {
    const { provider } = setup(() => json(body));
    await expect(provider.getBars('TSLA', window)).rejects.toThrow(SymbolNotFoundError);
  });

  it('propagates a non-ET exchange as UnsupportedExchangeError', async () => {
    const body = structuredClone(okBody);
    body.chart.result[0]!.meta.exchangeTimezoneName = 'Europe/London';
    const { provider } = setup(() => json(body));
    await expect(provider.getBars('VOD.L', window)).rejects.toThrow(UnsupportedExchangeError);
  });

  it('returns no bars when Yahoo omits the timestamp array', async () => {
    const body = {
      chart: { result: [{ meta: { exchangeTimezoneName: 'America/New_York' }, indicators: { quote: [{}] } }], error: null },
    };
    const { provider } = setup(() => json(body));
    expect((await provider.getBars('TSLA', window)).bars).toEqual([]);
  });
});
