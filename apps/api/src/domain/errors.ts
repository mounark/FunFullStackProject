/**
 * Base of every typed domain error. Each subclass fixes its own stable `code`,
 * HTTP `status` and `title`; the HTTP layer reads these, so adding an error needs
 * no handler change. `message` is safe to send to clients; `detailForLog` is not.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;
  abstract readonly title: string;

  /** `detailForLog` carries upstream or raw-input details that must only be logged, never returned. */
  constructor(
    message: string,
    readonly detailForLog?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Our own validation rejected the symbol (not a plain US stock ticker). */
export class InvalidSymbolError extends AppError {
  readonly code = 'INVALID_SYMBOL';
  readonly status = 400;
  readonly title = 'Invalid symbol';
  constructor(detailForLog?: unknown) {
    super('Symbol must be a US stock ticker: a letter followed by letters, digits, "." or "-", up to 15 characters.', detailForLog);
  }
}

/** Yahoo has no data for the symbol (404, `chart.error`, or an empty result). */
export class SymbolNotFoundError extends AppError {
  readonly code = 'SYMBOL_NOT_FOUND';
  readonly status = 404;
  readonly title = 'Symbol not found';
  constructor(detailForLog?: unknown) {
    super('No data was found for this symbol.', detailForLog);
  }
}

/** The symbol trades outside America/New_York, so it is out of scope. */
export class UnsupportedExchangeError extends AppError {
  readonly code = 'UNSUPPORTED_EXCHANGE';
  readonly status = 422;
  readonly title = 'Unsupported exchange';
  constructor(detailForLog?: unknown) {
    super('Only US-listed symbols are supported.', detailForLog);
  }
}

/** Yahoo answered 429. */
export class UpstreamRateLimitedError extends AppError {
  readonly code = 'UPSTREAM_RATE_LIMITED';
  readonly status = 503;
  readonly title = 'Upstream rate limited';
  constructor(detailForLog?: unknown) {
    super('The market data provider is rate limiting requests. Try again later.', detailForLog);
  }
}

/** Yahoo did not respond within our timeout. */
export class UpstreamTimeoutError extends AppError {
  readonly code = 'UPSTREAM_TIMEOUT';
  readonly status = 504;
  readonly title = 'Upstream timeout';
  constructor(detailForLog?: unknown) {
    super('The market data provider did not respond in time.', detailForLog);
  }
}

/** Network failure or a Yahoo 5xx. The only error kind (with timeouts) that is retried. */
export class UpstreamUnavailableError extends AppError {
  readonly code = 'UPSTREAM_UNAVAILABLE';
  readonly status = 502;
  readonly title = 'Upstream unavailable';
  constructor(detailForLog?: unknown) {
    super('The market data provider is unavailable.', detailForLog);
  }
}

/** Yahoo rejected the range (422): the month is older than its 60-day intraday window. */
export class UpstreamRangeUnavailableError extends AppError {
  readonly code = 'UPSTREAM_RANGE_UNAVAILABLE';
  readonly status = 502;
  readonly title = 'Upstream range unavailable';
  constructor(detailForLog?: unknown) {
    super('The market data provider has no intraday data for the requested month.', detailForLog);
  }
}

/** Yahoo replied with something we cannot trust: bad JSON, schema failure, unexpected 4xx, or mismatched arrays. */
export class UpstreamInvalidResponseError extends AppError {
  readonly code = 'UPSTREAM_INVALID_RESPONSE';
  readonly status = 502;
  readonly title = 'Upstream invalid response';
  constructor(detailForLog?: unknown) {
    super('The market data provider returned an invalid response.', detailForLog);
  }
}
