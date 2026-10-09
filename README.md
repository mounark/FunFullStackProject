# Monthly Market Snapshot

Enter a US stock ticker and get per-day statistics for the **previous calendar month**, computed
from Yahoo Finance 15-minute bars: the average of the bar lows, the average of the bar highs, and
the total volume for each trading day. A Fastify API, which uses Node.js serves the numbers and a React UI shows them
as summary tiles, two interactive charts and a interactive table.

## Quick start

Requires Node.js (a current LTS) and pnpm.

```sh
pnpm install

pnpm --filter api dev     # terminal 1: API on http://localhost:3000
pnpm --filter web dev     # terminal 2: UI, usually http://localhost:5173
```

Open the UI URL, type a ticker (`TSLA`, `BRK-B`, `CVR`) and press **Get stats**. The Vite dev server
proxies `/api` to the API, so the browser stays same-origin.

| Command | What it does |
|---|---|
| `pnpm test` | Unit, integration and UI tests in every package. No network. |
| `pnpm -r typecheck` | TypeScript strict checks. |
| `pnpm -r lint` | ESLint. |
| `pnpm --filter web build` | Production build of the UI. |
| `pnpm --filter api test:live` | Opt-in tests against the real Yahoo Finance (see [Testing](#testing)). |

## Tech stack

TypeScript end to end: a Fastify API, a React + Vite UI, and a shared package, all on one toolchain
(pnpm, Vitest, ESLint, `tsc`). The stack is one of the options the assignment allowed, chosen to
reduce risk:

- **One language across the boundary.** Yahoo's data arrives as JSON, which JavaScript and TypeScript
  handle natively, with no mapping layer between wire format and code. The API and the UI also share
  one `DailyStat` type and zod schema (`packages/shared`), so the response shape cannot drift between
  the two sides.
- **Fewer moving parts.** A single language means one set of tooling, one test runner and one way to
  mock things, instead of several build systems and bridges that can break or add clutter.
- **Validation at the edges.** zod checks every external input (Yahoo's response, request
  parameters, environment config), so TypeScript's types describe data that has actually been checked.

## API

`GET /api/stocks/:symbol/daily-stats`

```sh
curl -s localhost:3000/api/stocks/tsla/daily-stats
```

```json
[
  { "day": "2026-09-01", "lowAverage": 356.1709, "highAverage": 358.0532, "volume": 31404037 }
]
```

The response is exactly an array of `{ day, lowAverage, highAverage, volume }`, sorted by `day`
ascending. The `DailyStat` type and its zod schema live in `packages/shared`, so the API and the UI
agree on the shape.

- **Symbol:** trimmed and uppercased, then it must match `^[A-Z][A-Z0-9.-]{0,14}$`. US stocks only:
  indices (`^GSPC`), futures and FX (`ES=F`) are rejected.
- **No usable data** returns `200 []`.

### Errors

Errors are `application/problem+json` with a stable `code`. Upstream details are logged, never
returned.

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_SYMBOL` | The symbol fails validation. |
| 404 | `SYMBOL_NOT_FOUND` | Yahoo has no data for it. |
| 422 | `UNSUPPORTED_EXCHANGE` | The symbol does not trade in `America/New_York`. |
| 503 | `UPSTREAM_RATE_LIMITED` | Yahoo answered 429. |
| 504 | `UPSTREAM_TIMEOUT` | Yahoo did not answer in time. |
| 502 | `UPSTREAM_UNAVAILABLE` | Network failure or a Yahoo 5xx. |
| 502 | `UPSTREAM_RANGE_UNAVAILABLE` | The month is older than Yahoo's 60-day intraday window. |
| 502 | `UPSTREAM_INVALID_RESPONSE` | Bad JSON, schema failure, unexpected 4xx, mismatched arrays. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. The detail is only logged. |

## How the numbers are computed

- **Window.** "Last month" is the previous calendar month in `America/New_York`, derived from the
  current time read in Eastern Time (it rolls over at midnight ET). The request uses
  `period1` = UTC midnight of the 1st of that month and `period2` = UTC midnight of the 1st of the
  current month, with no padding. After fetching, only bars whose Eastern date falls in the month are
  kept, which also discards the extra zero-volume "quote" bar Yahoo sometimes appends.
- **Grouping.** Bars are grouped by their Eastern calendar date (using `Intl`, never a fixed
  offset), so daylight saving time is handled.
- **Per day.** `lowAverage` is the mean of the bar lows, `highAverage` the mean of the bar highs,
  and `volume` the sum of bar volumes. Inputs are never rounded; each average is rounded **once, to
  4 decimal places**, at the end.
- **Bad data.** Bars with a null low, high or volume are dropped. A zero-volume bar with real prices
  is valid and kept. A day left with no valid bars is omitted and logged once at warn level.
- **Regular session only.** Pre- and post-market bars are not requested.

## Assumptions and limitations

- **60-day limit.** Yahoo serves 15-minute data only for roughly the last 60 days and rejects older
  requests whole. On the 31st after a 31-day month (and some borderline 30th/31st dates) the start of
  last month is too old, and the API returns `502 UPSTREAM_RANGE_UNAVAILABLE` instead of a partial
  month.
- **Yahoo failures that are not "no data".** A 200 response carrying `chart.error` or an empty
  `result` is treated as symbol not found (404). A response with no timestamps is `200 []`. Any other
  unexpected non-2xx status (for example 403) is `502 UPSTREAM_INVALID_RESPONSE`.
- **Retries.** One retry after a fixed 60 seconds, only for network errors, timeouts and 5xx. Never
  for 4xx or 429. A request that hits one of these failures therefore takes over a minute to answer.
- **Cache.** The raw bars for a symbol and month are cached in memory for 24 hours; aggregation runs
  on every request. The cache is per process, is not shared, and does not de-duplicate simultaneous
  misses.
- **User-Agent.** Yahoo answers 429 without one, so the provider sends a fixed `User-Agent`. It is
  deliberately not configurable.
- **Averages.** The summary tiles in the UI show the mean of the daily averages, not a
  volume-weighted figure.
- **Deployment.** The UI relies on the dev proxy. A production setup needs the same same-origin
  arrangement (a reverse proxy), or CORS enabled on the API.

## Configuration

The API reads these environment variables once at startup and fails fast if one is invalid.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Listen port. |
| `HOST` | `0.0.0.0` | Listen address. |
| `LOG_LEVEL` | `info` | pino level (`silent` for none). |
| `UPSTREAM_TIMEOUT_MS` | `5000` | Timeout per Yahoo request. |
| `UPSTREAM_RETRIES` | `1` | Retries after a retryable failure. |
| `UPSTREAM_BACKOFF_MS` | `60000` | Fixed wait before a retry. |
| `CACHE_TTL_MS` | `86400000` | Cache lifetime (24 hours). |

## Project layout

```
apps/api         Fastify + TypeScript API
apps/web         React + Vite + TypeScript UI
packages/shared  DailyStat type and zod schema, used by both apps
```

Inside `apps/api/src`, dependencies point inward only:

- `domain/` pure logic and types: window, symbol validation, aggregation, errors, and the interfaces
  (`MarketDataProvider`, `Clock`, `Cache`, `Logger`). No I/O.
- `application/` the service that orchestrates one request.
- `http/` the thin Fastify edge: one route and one central error handler.
- `infrastructure/` the Yahoo provider (transport, status handling, retry), its zod wire schema and
  mapper, the in-memory TTL cache, and the cache decorator.

`buildApp` in `app.ts` is the composition root and the only place concrete classes are built. Caching
is a `MarketDataProvider` decorator, so it is added without changing the Yahoo provider. In the UI,
each component has one job and the API client is injected through a typed `StatsApi` interface.

## Testing

Everything uses Vitest, and the default test run never touches the network.

- **API:** unit tests for the pure logic, the Yahoo provider against an injected `fetch` fake
  (429, 404, 422, 5xx, truncated JSON, timeouts, the `User-Agent` header), HTTP behavior through
  `fastify.inject()` with a fake provider, and a **ground-truth** test: real Yahoo responses for
  TSLA and CVR (September 2026) must produce exactly the expected output in
  `apps/api/test/fixtures/expected/`.
- **Web:** React Testing Library, user-event and jest-dom, with MSW standing in for the API.
- **Live tests:** `pnpm --filter api test:live` runs the full app against real Yahoo for TSLA, CVR
  and BRK-B and writes each response to `apps/api/test/live/output/` (gitignored). The TSLA and CVR
  tests compare to the ground truth and skip themselves once last month is no longer September 2026;
  BRK-B checks the shape and invariants of the response.

## Data source

Price data comes from Yahoo Finance's public chart endpoint (15-minute bars, regular session). This
project is not affiliated with or endorsed by Yahoo. Yahoo's terms and availability may change.

## Additional references

These two files are part of the submission and show how the project was built:

- [CLAUDE.md](CLAUDE.md) — the specification the backend was generated from: architecture and SOLID
  rules, domain rules, error table, testing rules and working agreements. It is the source of truth
  for behavior. Prompting and research was done before hand. An example prompt send to Claude would be
  "Tell me the pros and cons of using Node.js with Fastify vs C# for the backend". Several research prompts
  were given. These were not included for 2 reasons, #1, they did not create any part of the literal project.
  #2 This file is a part of the prompt as it servers as the cached context and ground truth.
- [PROMPT_LOG.md](PROMPT_LOG.md) — every prompt given to the AI assistant while building the project,
  numbered in order.
