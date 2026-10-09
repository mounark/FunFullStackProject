import type { DailyStat } from '@takehome/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, toApiError, type StatsApi } from '../api/statsApi';
import { INVALID_SYMBOL_MESSAGE, isValidSymbol, normalizeSymbol } from '../symbol';

export type DailyStatsState =
  | { status: 'idle' }
  | { status: 'loading'; symbol: string }
  | { status: 'success'; symbol: string; stats: DailyStat[] }
  | { status: 'error'; symbol: string; error: ApiError };

/**
 * Loads daily stats through `api`; a newer request (or unmounting) cancels the one in flight.
 * Tickers that break the symbol rule are rejected here and never reach the network.
 */
export function useDailyStats(api: StatsApi) {
  const [state, setState] = useState<DailyStatsState>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const load = useCallback(
    async (rawSymbol: string) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      const symbol = normalizeSymbol(rawSymbol);
      if (!isValidSymbol(symbol)) {
        setState({ status: 'error', symbol, error: new ApiError('INVALID_SYMBOL', INVALID_SYMBOL_MESSAGE) });
        return;
      }

      setState({ status: 'loading', symbol });
      try {
        const stats = await api.getDailyStats(symbol, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'success', symbol, stats });
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', symbol, error: toApiError(error) });
      }
    },
    [api],
  );

  return { state, load };
}
