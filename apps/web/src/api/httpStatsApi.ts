import { dailyStatSchema, type DailyStat } from '@takehome/shared';
import { z } from 'zod';
import { ApiError, type StatsApi } from './statsApi';

const statsResponse = z.array(dailyStatSchema);
const problemResponse = z.object({ code: z.string(), detail: z.string() });

/** `StatsApi` backed by the backend's `GET /api/stocks/:symbol/daily-stats`. */
export class HttpStatsApi implements StatsApi {
  /** `baseUrl` is empty in the browser (same origin, via the dev proxy); tests pass an absolute URL. */
  constructor(private readonly baseUrl = '') {}

  /** Fetches and validates the stats; throws `ApiError` for every failure except an abort. */
  async getDailyStats(symbol: string, signal?: AbortSignal): Promise<DailyStat[]> {
    const url = `${this.baseUrl}/api/stocks/${encodeURIComponent(symbol)}/daily-stats`;

    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('NETWORK', 'Could not reach the server. Check your connection and try again.');
    }

    if (!response.ok) throw await toProblemError(response);

    const parsed = statsResponse.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) {
      throw new ApiError('INVALID_RESPONSE', 'The server returned data in an unexpected format.');
    }
    return parsed.data;
  }
}

/** Reads an `application/problem+json` body; falls back to a generic error if it is anything else. */
async function toProblemError(response: Response): Promise<ApiError> {
  const problem = problemResponse.safeParse(await response.json().catch(() => undefined));
  return problem.success
    ? new ApiError(problem.data.code, problem.data.detail, response.status)
    : new ApiError('HTTP_ERROR', `The request failed (HTTP ${response.status}).`, response.status);
}
