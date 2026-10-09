import {
  AppError,
  SymbolNotFoundError,
  UpstreamInvalidResponseError,
  UpstreamRangeUnavailableError,
  UpstreamRateLimitedError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from '../../domain/errors';
import type { MarketData, MonthWindow } from '../../domain/marketData';
import type { Logger, MarketDataProvider } from '../../domain/ports';
import { toMarketData } from './mapper';
import { yahooChartResponse } from './wireSchema';

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
// Hardcoded on purpose: without a User-Agent Yahoo answers 429. Do not make configurable.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** Everything the provider needs from outside; `sleep` is overridable so tests do not wait. */
export interface YahooProviderOptions {
  fetch: typeof fetch;
  logger: Logger;
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  sleep?: (ms: number) => Promise<void>;
}

/** Fetches 15-minute bars from Yahoo Finance and classifies every failure as a typed error. */
export class YahooMarketDataProvider implements MarketDataProvider {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: YahooProviderOptions) {
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /** Builds the chart URL for the window, fetches it (with retry), then parses and maps the body. */
  async getBars(symbol: string, window: MonthWindow): Promise<MarketData> {
    const url =
      `${BASE_URL}/${encodeURIComponent(symbol)}` +
      `?interval=15m&period1=${window.period1}&period2=${window.period2}`;

    const body = await this.fetchWithRetry(symbol, url);
    return this.parse(symbol, body);
  }

  /** Runs `fetchOnce`, retrying after `backoffMs` only on timeouts and unavailability, up to `retries` times. */
  private async fetchWithRetry(symbol: string, url: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.fetchOnce(symbol, url);
      } catch (error) {
        const retryable = error instanceof UpstreamTimeoutError || error instanceof UpstreamUnavailableError;
        if (!retryable || attempt >= this.options.retries) throw error;
        await this.sleep(this.options.backoffMs);
      }
    }
  }

  /** One attempt: returns the body of a 2xx response, or throws a typed error. */
  private async fetchOnce(symbol: string, url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.options.fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      this.throwForStatus(symbol, response.status);
      return await response.text();
    } catch (error) {
      if (controller.signal.aborted) throw new UpstreamTimeoutError(error);
      if (error instanceof AppError) throw error;
      throw new UpstreamUnavailableError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Throws the typed error for a non-2xx status; returns normally for 2xx. Order matters: 429, 404, 422, 5xx, other. */
  private throwForStatus(symbol: string, status: number): void {
    if (status >= 200 && status < 300) return;
    this.options.logger.warn({ symbol, status }, 'upstream returned non-2xx');
    if (status === 429) throw new UpstreamRateLimitedError({ status });
    if (status === 404) throw new SymbolNotFoundError({ status });
    if (status === 422) throw new UpstreamRangeUnavailableError({ status });
    if (status >= 500) throw new UpstreamUnavailableError({ status });
    throw new UpstreamInvalidResponseError({ status });
  }

  /** Turns a 2xx body into market data: JSON, then zod schema, then the no-result check, then the mapper. */
  private parse(symbol: string, body: string): MarketData {
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch (error) {
      throw new UpstreamInvalidResponseError(error);
    }
    const parsed = yahooChartResponse.safeParse(json);
    if (!parsed.success) throw new UpstreamInvalidResponseError(parsed.error);

    const { result, error } = parsed.data.chart;
    if (error || !result || result.length === 0) {
      this.options.logger.warn({ symbol, error }, 'upstream returned no result');
      throw new SymbolNotFoundError(error);
    }
    return toMarketData(result[0]!);
  }
}
