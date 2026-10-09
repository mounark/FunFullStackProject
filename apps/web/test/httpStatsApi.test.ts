import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/api/statsApi';
import { HttpStatsApi } from '../src/api/httpStatsApi';
import { BASE_URL, sampleStats } from './fixtures';
import { server } from './server';

const URL_PATTERN = `${BASE_URL}/api/stocks/:symbol/daily-stats`;
const problem = (status: number, code: string, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'x', status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

const api = new HttpStatsApi(BASE_URL);
const failure = async (symbol = 'TSLA') => api.getDailyStats(symbol).then(() => null, (e: unknown) => e);

describe('HttpStatsApi', () => {
  it('returns validated stats and URL-encodes the symbol', async () => {
    let seen = '';
    server.use(
      http.get(URL_PATTERN, ({ params }) => {
        seen = String(params.symbol);
        return HttpResponse.json(sampleStats);
      }),
    );
    expect(await api.getDailyStats('BRK-B')).toEqual(sampleStats);
    expect(seen).toBe('BRK-B');
  });

  it('turns a problem+json response into an ApiError with the server message', async () => {
    server.use(http.get(URL_PATTERN, () => problem(400, 'INVALID_SYMBOL', 'Symbol must be a ticker.')));
    const error = await failure('^GSPC');
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INVALID_SYMBOL', status: 400, message: 'Symbol must be a ticker.' });
  });

  it('falls back to a generic HTTP error for non-problem bodies', async () => {
    server.use(http.get(URL_PATTERN, () => new HttpResponse('Bad Gateway', { status: 502 })));
    expect(await failure()).toMatchObject({ code: 'HTTP_ERROR', status: 502 });
  });

  it('reports an unreachable server as NETWORK', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.error()));
    expect(await failure()).toMatchObject({ code: 'NETWORK' });
  });

  it('rejects a 200 with the wrong shape as INVALID_RESPONSE', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json([{ day: 'nope' }])));
    expect(await failure()).toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects a non-JSON 200 as INVALID_RESPONSE', async () => {
    server.use(http.get(URL_PATTERN, () => new HttpResponse('<html></html>', { status: 200 })));
    expect(await failure()).toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
