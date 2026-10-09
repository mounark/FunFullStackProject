# Project: Daily intraday stats (take-home assessment)

Full-stack app. A Fastify + TypeScript API takes a US stock symbol and returns per-day
statistics for the **previous calendar month**, computed from Yahoo Finance 15-minute bars.
A React + TypeScript UI consumes the API and shows the result as a table and chart.
Treat this as an MVP whose requirements will grow: production quality, small and readable.

## Layout (pnpm workspace)

- `apps/api` Fastify + TypeScript API
- `apps/web` React + Vite + TypeScript UI 
- `packages/shared` the `DailyStat` type and its zod schema, imported by both apps

Keep this section and the commands below in sync with reality. If a script or rule changes, tell me so I can update this file.

Commands (expected names, verify after scaffolding): `pnpm install`, `pnpm test`,
`pnpm -r typecheck`, `pnpm -r lint`, `pnpm --filter api dev`, `pnpm --filter web dev`, `pnpm --filter web build`, `pnpm --filter api test:live`.

## Architecture

Layers inside `apps/api/src`, dependencies point inward only:

- `domain/` pure logic and types. No I/O, no framework, imports nothing from other layers (importing `packages/shared` is allowed).
- `application/` service that orchestrates a request.
- `http/` the thin Fastify edge: routes, schemas, one central error handler.
- `infrastructure/` Yahoo provider, wire schema, mapper, cache decorator.

Rules:

- `buildApp(deps)` in `app.ts` is the composition root. Plain constructor injection, no DI framework.
- Interfaces only at real seams: `MarketDataProvider`, cache, `Clock`, the `fetch` transport, the logger. No other speculative abstractions. Stateless logic is a pure function, not a class.
- Route handlers validate input, call the service, return the result. Nothing more.
- Validate everything external with zod at the boundary (Yahoo response, request params, env config).

## SOLID

All code follows SOLID. Classes are used where there is state or a seam (service, provider, cache decorator, error types); stateless logic stays a pure function. No abstraction without a real second implementation or test fake.

- **S, single responsibility:** one reason to change per module. Window calculation, symbol validation, wire-to-domain mapping, aggregation, the Yahoo provider (transport and status classification), the service (orchestration) and the cache decorator are separate units. The route handler only validates, delegates and returns.
- **O, open-closed:** new behavior is added by a new implementation or decorator, not by editing existing code. Caching is a `MarketDataProvider` decorator. Error-to-HTTP mapping is a lookup keyed by error type, not an if-chain, so a new error needs one new entry.
- **L, Liskov substitution:** every `MarketDataProvider` (Yahoo, the cache decorator, test fakes) honors one contract: same input, same `DailyStat`-source result shape, failures only as the typed domain errors. All domain errors extend one base error carrying `code` and status. A fake that violates the contract is a bug.
- **I, interface segregation:** interfaces are as narrow as their consumers need. `Clock` exposes only `now()`. The logger type exposes only the methods the service calls. The cache exposes only get and set. A consumer never depends on methods it doesn't call.
- **D, dependency inversion:** high-level code depends on the interfaces above, never on Yahoo, `fetch` or pino directly. Only `buildApp` constructs concrete implementations. `domain/` depends on nothing.
- **Web (`apps/web`):** components have a single job, and the API client is injected through a typed interface so tests can substitute it.

## Domain rules (source of truth, do not reinterpret)

**Upstream request**
- `GET https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=15m&period1=..&period2=..`
- Always send the hardcoded `User-Agent` `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`. It is not configurable, and Claude must never change it. Without one Yahoo answers 429 with a plain-text body. Observed 2026-10-09: a fuller Chrome-on-Mac string also got 429.
- Regular session only (leave `includePrePost` at its default).
- Bar timestamps are epoch seconds of the bar start. Prices and volumes arrive as parallel arrays aligned with `timestamp`.

**Window**
- Target month = the previous calendar month in `America/New_York`, derived from an injected `Clock`. "Now" is read in ET (the month rolls over at midnight ET).
- Request `period1` = UTC midnight of the 1st of the target month; `period2` = UTC midnight of the 1st of the current month (September 2026: `1788220800` and `1790812800`). No padding: US regular sessions (13:30 to 21:00 UTC, EDT or EST) always fall inside these boundaries, and padding would only bring forward the day Yahoo rejects the request (see below).
- After fetching, keep only bars whose ET date falls inside the target month.
- Yahoo may append one flat, zero-volume "quote" bar stamped at `meta.regularMarketTime`, even outside the requested window. It carries no information. The TSLA fixture contains one (Oct 8 16:00) and the CVR fixture contains none. The month filter removes it when present. Do not special-case it and do not rely on it being there.
- Yahoo serves 15-minute data only for about the last 60 days. A request whose `period1` is older is rejected whole (not truncated) with HTTP 422 and `{"chart":{"result":null,"error":{"code":"Unprocessable Entity","description":"15m data not available for startTime=... and endTime=.... The requested range must be within the last 60 days."}}}`. With the boundaries above this happens only when the 1st of the target month is more than 60 days back: the 31st after a 31-day month (Jan 31 and Aug 31 in 2026). Exactly-60-day cases (the 30th or 31st of several other months) are borderline and may depend on the time of day. Do not clamp the window or return a partial month; surface the error.

**Grouping and aggregation**
- Group by `America/New_York` local date using `Intl` (never `gmtoffset`, never a fixed offset). Key format `YYYY-MM-DD`.
- Per day: `lowAverage` = mean of bar `low`, `highAverage` = mean of bar `high`, `volume` = sum of bar `volume`.
- Never round inputs. Sum raw numbers, then round each average once at the end with `Number(x.toFixed(4))`. Output plain JSON numbers (trailing zeros are dropped, e.g. 370.5). The README states the 4-decimal precision.
- Output is sorted ascending by `day`.
- Response is exactly `[{ "day", "lowAverage", "highAverage", "volume" }]`, with no extra fields.

**Bad data**
- Drop any bar where `low`, `high`, or `volume` is null.
- A day left with no valid bars is omitted from the output and logged once at warn level (symbol, day, dropped-bar count) through the injected logger. Never emit zeros or day-only objects.
- No usable data at all: respond `200` with `[]`.
- A zero-volume bar with real prices is valid. Keep it.

**Scope guard**
- US-listed symbols only. If `meta.exchangeTimezoneName` is not `America/New_York`, throw `UnsupportedExchangeError` (422).

## API

- Web access: in development the Vite proxy sends `/api` to `localhost:3000`, so the browser
  stays same-origin and the API sends no CORS headers. A production deployment needs the same
  same-origin setup (reverse proxy), or CORS added to the API.
- `GET /api/stocks/:symbol/daily-stats`
- Symbol: trim and uppercase. The first character must be a letter; the rest may be letters, digits, `.` or `-`. Max 15 characters (`^[A-Z][A-Z0-9.-]{0,14}$`). URL-encode before building the upstream URL. Stocks only: indices (`^GSPC`), futures and FX (`ES=F`) are rejected with `InvalidSymbolError`.

## Errors

Typed domain errors, mapped to HTTP in one place. Responses use `application/problem+json`
with a stable `code` field. Never expose upstream details to clients; log them instead.

| Error | Status | Cause |
|---|---|---|
| `InvalidSymbolError` | 400 | our own validation |
| `SymbolNotFoundError` | 404 | Yahoo 404, or `chart.error` / empty `result` |
| `UnsupportedExchangeError` | 422 | non-ET exchange |
| `UpstreamRateLimitedError` | 503 | Yahoo 429 |
| `UpstreamTimeoutError` | 504 | our timeout |
| `UpstreamUnavailableError` | 502 | network failure, Yahoo 5xx |
| `UpstreamRangeUnavailableError` | 502 | Yahoo 422: requested range is older than its 60-day intraday window |
| `UpstreamInvalidResponseError` | 502 | non-JSON 2xx, schema failure, unexpected 4xx, mismatched array lengths |

Provider detection order: network error or abort, then status 429 (do not parse the body), then 404,
then 422 (range unavailable), then other non-2xx, then parse JSON and validate with zod. A 404 body looks like
`{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}`.

Resilience defaults (all configurable): 5 s upstream timeout; one retry with fixed 60 s wait on
network errors, timeouts and 5xx only (never on 4xx or 429); in-memory cache of the finished month keyed by
symbol + month with a long TTL.

## Testing

- Vitest everywhere. Tests never touch the network.
- Pure logic (aggregator, mapper, window/clock, symbol validation, cache, service with fakes) gets plain unit tests.
- The Yahoo provider is tested with an injected `fetch` fake that returns native `Response` objects (non-JSON bodies, 429, 404, 422 out-of-range, 5xx, truncated JSON, timeouts). Error bodies are built inline in the tests from the shapes documented in this file; the 429 body is the plain text `Too Many Requests`. No MSW on the backend.
- HTTP behavior is tested with `fastify.inject()` against `buildApp` with a fake provider.
- Frontend (later): React Testing Library + user-event + jest-dom, with MSW for the network.
- **Ground truth:** a table-driven test over the entries below. Each is a real Yahoo response fetched with exactly the request the app makes (`period1=1788220800`, `period2=1790812800`, no padding), plus the exact expected output in `apps/api/test/fixtures/expected/<symbol>-2026-09-daily-stats.json`. Pin the clock to `2026-10-01T12:00:00-04:00` for all entries and assert the outgoing request uses those two period values.
  - `tsla-2026-09`: liquid large-cap with clean data. 21 trading days, 26 bars each. The raw file holds 547 bars: 546 September bars plus a quote bar (Oct 8 16:00) that the month filter must remove.
  - `cvr-2026-09`: thinly traded NYSE American stock, chosen to exercise the bad-data rules. The raw file holds 546 bars (no quote bar) across 21 trading days. 462 bars are all-null and dropped; 84 are valid, 11 of them zero-volume with real prices (kept). Sept 25 has no valid bars, so it is omitted and logged once at warn level. The expected output has 20 days.
- Never edit existing fixtures or expected files. New ground-truth entries are added only by me (the user), fetched from Yahoo and with the expected output computed outside the app. Corner cases (nulls, mismatched lengths, missing or empty `timestamp`, ET month-boundary instants) use small inline inputs, not real files.
- Symbol validation tests accept `tsla`, ` aapl `, `BRK-B`, `BRK.B`, and reject `^GSPC`, `ES=F`, `..`, `.A`, `-A`, `1ABC`, an empty string, and a 16-character symbol.
- Provider tests assert that the outgoing request carries the hardcoded `User-Agent` header.
- Write tests first for new logic and show them failing before implementing.

## Conventions

- TypeScript strict, ESM, no `any`. Prices are plain `number`; no decimal library.
- Config comes from env, validated once at startup in `config.ts`.
- Structured logging through Fastify's pino logger. No `console.log`.
- Small, readable code over clever code.

## Working agreements

- Do only what the current prompt asks. Do not build ahead.
- If a rule here is ambiguous or conflicts with the request, ask. Do not invent behavior.
- Say why before adding any dependency.
- Assumptions that affect behavior belong in `README.md`; flag any new one so I can document it.
