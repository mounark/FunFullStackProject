import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { DailyStat } from '@takehome/shared';
import { App } from '../src/App';
import { HttpStatsApi } from '../src/api/httpStatsApi';
import { ApiError, type StatsApi } from '../src/api/statsApi';
import { BASE_URL, sampleStats } from './fixtures';
import { server } from './server';

const URL_PATTERN = `${BASE_URL}/api/stocks/:symbol/daily-stats`;
const problem = (status: number, code: string, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'x', status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

const renderApp = (api: StatsApi = new HttpStatsApi(BASE_URL)) => {
  const user = userEvent.setup();
  render(<App api={api} />);
  return user;
};

const search = async (user: ReturnType<typeof userEvent.setup>, symbol: string) => {
  await user.type(screen.getByLabelText('Ticker'), symbol);
  await user.click(screen.getByRole('button', { name: /get stats/i }));
};

describe('App', () => {
  it('makes the purpose obvious before any search', () => {
    renderApp();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { level: 1, name: 'Monthly Market Snapshot' })).toBeInTheDocument();
    expect(within(banner).getByText('Last calendar month')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticker')).toHaveAccessibleDescription(/US-listed stocks only/i);
    expect(within(screen.getByRole('contentinfo')).getByText('Yahoo Finance')).toBeInTheDocument();
  });

  it('explains how it works before any search', () => {
    renderApp();
    const steps = screen.getByRole('list', { name: /how it works/i });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
  });

  it('offers example tickers that fill the input and run the search', async () => {
    let seen = '';
    server.use(
      http.get(URL_PATTERN, ({ params }) => {
        seen = String(params.symbol);
        return HttpResponse.json(sampleStats);
      }),
    );
    const user = renderApp();
    const chips = screen.getByRole('list', { name: /example tickers/i });
    expect(within(chips).getAllByRole('button').map((b) => b.textContent)).toEqual(['TSLA', 'AAPL', 'BRK-B']);

    await user.click(within(chips).getByRole('button', { name: 'AAPL' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(seen).toBe('AAPL');
    expect(screen.getByLabelText('Ticker')).toHaveValue('AAPL');
    expect(screen.queryByRole('list', { name: /example tickers/i })).not.toBeInTheDocument();
  });

  it('shows the exact month in the header and summary tiles once data arrives', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json(sampleStats)));
    const user = renderApp();
    await search(user, 'tsla');
    await screen.findByRole('table');

    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('September 2026')).toBeInTheDocument();
    expect(within(banner).queryByText('Last calendar month')).not.toBeInTheDocument();

    const tile = (label: string) => screen.getByText(label).closest('div');
    expect(tile('Trading days')).toHaveTextContent('3');
    expect(tile('Average low')).toHaveTextContent('356.2236');
    expect(tile('Average high')).toHaveTextContent('359.1011');
    expect(tile('Total volume')).toHaveTextContent('51.4M');
  });

  it('returns the header to the generic wording after an error', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json(sampleStats)));
    const user = renderApp();
    await search(user, 'tsla');
    await screen.findByRole('table');

    await user.clear(screen.getByLabelText('Ticker'));
    await user.type(screen.getByLabelText('Ticker'), '^GSPC');
    await user.click(screen.getByRole('button', { name: /get stats/i }));
    await screen.findByRole('alert');
    expect(within(screen.getByRole('banner')).getByText('Last calendar month')).toBeInTheDocument();
  });

  it('starts with a prompt and a disabled button until a ticker is typed', async () => {
    const user = renderApp();
    expect(screen.getByText(/enter a us stock ticker/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /get stats/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText('Ticker'), 'tsla');
    expect(button).toBeEnabled();
  });

  it('shows both charts and the table for a valid ticker', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json(sampleStats)));
    const user = renderApp();
    await search(user, 'tsla');

    expect(await screen.findByRole('heading', { name: /TSLA/ })).toHaveTextContent('September 2026');
    expect(screen.getByRole('img', { name: /average price/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /volume/i })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(1 + sampleStats.length);
    expect(within(table).getByRole('columnheader', { name: 'Low average' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Sep 1' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '356.1709' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '31,404,037' })).toBeInTheDocument();
  });

  it('identifies the price series in a legend', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json(sampleStats)));
    const user = renderApp();
    await search(user, 'TSLA');
    const legend = await screen.findByRole('list', { name: /legend/i });
    expect(within(legend).getByText('Low average')).toBeInTheDocument();
    expect(within(legend).getByText('High average')).toBeInTheDocument();
  });

  it('sends the trimmed, uppercased ticker', async () => {
    let seen = '';
    server.use(
      http.get(URL_PATTERN, ({ params }) => {
        seen = String(params.symbol);
        return HttpResponse.json(sampleStats);
      }),
    );
    const user = renderApp();
    await search(user, '  brk-b ');
    await screen.findByRole('table');
    expect(seen).toBe('BRK-B');
  });

  it.each(['^GSPC', 'ES=F', '1ABC', 'A'.repeat(16)])(
    'rejects %j in the browser without calling the API',
    async (ticker) => {
      let calls = 0;
      const api: StatsApi = {
        getDailyStats: async () => {
          calls += 1;
          return sampleStats;
        },
      };
      const user = renderApp(api);
      await search(user, ticker);

      expect(await screen.findByRole('alert')).toHaveTextContent(/us stock ticker/i);
      expect(calls).toBe(0);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    },
  );

  it('still shows the server message if the API rejects a ticker the browser accepted', async () => {
    server.use(http.get(URL_PATTERN, () => problem(400, 'INVALID_SYMBOL', 'Server says no.')));
    const user = renderApp();
    await search(user, 'TSLA');
    expect(await screen.findByRole('alert')).toHaveTextContent('Server says no.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a not-found message for an unknown ticker', async () => {
    server.use(http.get(URL_PATTERN, () => problem(404, 'SYMBOL_NOT_FOUND', 'No data was found for this symbol.')));
    const user = renderApp();
    await search(user, 'ZZZZ');
    expect(await screen.findByRole('alert')).toHaveTextContent('No data was found for this symbol.');
  });

  it('shows a friendly message when the server cannot be reached', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.error()));
    const user = renderApp();
    await search(user, 'TSLA');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
  });

  it('explains an empty month instead of drawing empty charts', async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json([])));
    const user = renderApp();
    await search(user, 'TSLA');
    expect(await screen.findByText(/no trading data for TSLA last month/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a loading state while the request is pending, then the result', async () => {
    let resolve!: (stats: DailyStat[]) => void;
    const api: StatsApi = { getDailyStats: () => new Promise((r) => (resolve = r)) };
    const user = renderApp(api);
    await search(user, 'TSLA');

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();

    resolve(sampleStats);
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clears an earlier error when the next search succeeds', async () => {
    let call = 0;
    const api: StatsApi = {
      getDailyStats: async () => {
        if (call++ === 0) throw new ApiError('INVALID_SYMBOL', 'Bad ticker.', 400);
        return sampleStats;
      },
    };
    const user = renderApp(api);
    await search(user, 'x');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Ticker'));
    await search(user, 'TSLA');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
