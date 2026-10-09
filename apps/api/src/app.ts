import Fastify from 'fastify';
import { DailyStatsService } from './application/dailyStatsService';
import type { Config } from './config';
import type { Clock, MarketDataProvider } from './domain/ports';
import type { MarketData } from './domain/marketData';
import { InMemoryTtlCache } from './infrastructure/cache';
import { CachingMarketDataProvider } from './infrastructure/cachingProvider';
import { systemClock } from './infrastructure/systemClock';
import { YahooMarketDataProvider } from './infrastructure/yahoo/yahooProvider';
import { errorHandler } from './http/errorHandler';
import { registerRoutes } from './http/routes';

/** Dependencies of `buildApp`; tests override `clock` and `provider`. */
export interface AppDeps {
  config: Config;
  clock?: Clock;
  /** Tests inject a fake; production builds Yahoo behind the cache decorator. */
  provider?: MarketDataProvider;
}

/** Composition root: the only place concrete implementations are constructed. */
export async function buildApp({ config, clock = systemClock, provider }: AppDeps) {
  const app = Fastify({ logger: { level: config.logLevel } });

  const marketData =
    provider ??
    new CachingMarketDataProvider(
      new YahooMarketDataProvider({
        fetch: globalThis.fetch,
        logger: app.log,
        timeoutMs: config.upstreamTimeoutMs,
        retries: config.upstreamRetries,
        backoffMs: config.upstreamBackoffMs,
      }),
      new InMemoryTtlCache<MarketData>(config.cacheTtlMs, clock),
    );

  app.setErrorHandler(errorHandler);
  registerRoutes(app, new DailyStatsService(marketData, clock, app.log));
  return app;
}
