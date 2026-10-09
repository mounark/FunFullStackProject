import type { DailyStat } from '@takehome/shared';
import { aggregateDailyStats } from '../domain/aggregate';
import type { Clock, Logger, MarketDataProvider } from '../domain/ports';
import { targetMonthWindow } from '../domain/window';

/** Orchestrates one request: pick the month, fetch bars, aggregate, and log omitted days. */
export class DailyStatsService {
  constructor(
    private readonly provider: MarketDataProvider,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /**
   * Daily stats for the previous calendar month. `symbol` must already be normalized.
   * Provider errors propagate unchanged.
   */
  async getDailyStats(symbol: string): Promise<DailyStat[]> {
    const window = targetMonthWindow(this.clock.now());
    const { bars } = await this.provider.getBars(symbol, window);
    const { stats, emptyDays } = aggregateDailyStats(bars, window.month);
    for (const { day, droppedBars } of emptyDays) {
      this.logger.warn({ symbol, day, droppedBars }, 'day omitted: no valid bars');
    }
    return stats;
  }
}
