import type { FastifyInstance } from 'fastify';
import type { DailyStatsService } from '../application/dailyStatsService';
import { normalizeSymbol } from '../domain/symbol';

/** Registers the API's single endpoint. The handler only validates, delegates and returns. */
export function registerRoutes(app: FastifyInstance, service: DailyStatsService): void {
  app.get<{ Params: { symbol: string } }>('/api/stocks/:symbol/daily-stats', async (request) => {
    const symbol = normalizeSymbol(request.params.symbol);
    return service.getDailyStats(symbol);
  });
}
