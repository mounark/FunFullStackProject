import type { DailyStat } from '@takehome/shared';

/** The seam between the UI and the network; tests and `main.tsx` supply the implementation. */
export interface StatsApi {
  getDailyStats(symbol: string, signal?: AbortSignal): Promise<DailyStat[]>;
}

/** A failed request, reduced to a stable `code` and a message that is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Normalizes anything thrown while loading into an `ApiError` the UI can display. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError('UNKNOWN', 'Something went wrong. Please try again.');
}
