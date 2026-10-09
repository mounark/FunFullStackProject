import { PriceChart } from '../chart/PriceChart';
import { VolumeChart } from '../chart/VolumeChart';
import { formatMonth } from '../format';
import type { DailyStatsState } from '../hooks/useDailyStats';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { LoadingSkeleton } from './LoadingSkeleton';
import { SummaryTiles } from './SummaryTiles';
import { StatsTable } from './StatsTable';

/** Renders whichever of idle, loading, error, empty or result the current state calls for. */
export function ResultPanel({ state, onPick }: { state: DailyStatsState; onPick: (symbol: string) => void }) {
  switch (state.status) {
    case 'idle':
      return <EmptyState onPick={onPick} />;
    case 'loading':
      return <LoadingSkeleton symbol={state.symbol} />;
    case 'error':
      return <ErrorMessage message={state.error.message} />;
    case 'success': {
      const first = state.stats[0];
      if (!first) return <p className="message">No trading data for {state.symbol} last month.</p>;
      return (
        <div className="results" key={state.symbol}>
          <h2>
            {state.symbol} <span className="month">{formatMonth(first.day)}</span>
          </h2>
          <SummaryTiles stats={state.stats} />
          <PriceChart stats={state.stats} />
          <VolumeChart stats={state.stats} />
          <StatsTable stats={state.stats} />
        </div>
      );
    }
  }
}
