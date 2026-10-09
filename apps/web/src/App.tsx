import { useState } from 'react';
import type { StatsApi } from './api/statsApi';
import { Hero } from './components/Hero';
import { ResultPanel } from './components/ResultPanel';
import { SymbolForm } from './components/SymbolForm';
import { formatMonth } from './format';
import { useDailyStats, type DailyStatsState } from './hooks/useDailyStats';

/** The month the data covers, known only once a result with at least one day has arrived. */
function loadedMonth(state: DailyStatsState): string | null {
  const first = state.status === 'success' ? state.stats[0] : undefined;
  return first ? formatMonth(first.day) : null;
}

/** Page layout: header, ticker form, result and footer. The API is injected so tests can swap it. */
export function App({ api }: { api: StatsApi }) {
  const { state, load } = useDailyStats(api);
  const [ticker, setTicker] = useState('');

  function pick(symbol: string) {
    setTicker(symbol);
    void load(symbol);
  }

  return (
    <>
      <Hero month={loadedMonth(state)} />
      <main>
        <section className="search-card">
          <SymbolForm value={ticker} onChange={setTicker} busy={state.status === 'loading'} onSubmit={load} />
        </section>
        <ResultPanel state={state} onPick={pick} />
      </main>
      <footer>
        Source: <span className="wordmark">Yahoo Finance</span> · 15-minute regular-session bars · days are grouped by New York time
      </footer>
    </>
  );
}
