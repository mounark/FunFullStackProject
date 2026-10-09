import type { MarketData, MonthWindow } from './marketData';

/**
 * Source of 15-minute bars for one symbol and month. Every implementation (Yahoo, the
 * caching decorator, test fakes) honors the same contract and fails only with AppError subclasses.
 */
export interface MarketDataProvider {
  getBars(symbol: string, window: MonthWindow): Promise<MarketData>;
}

/** The current time, injected so month logic can be tested. */
export interface Clock {
  now(): Date;
}

/** Minimal key-value store; expiry is the implementation's concern. */
export interface Cache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

/** The only logging method the app calls. Fastify's pino logger satisfies it. */
export interface Logger {
  warn(obj: object, msg: string): void;
}
