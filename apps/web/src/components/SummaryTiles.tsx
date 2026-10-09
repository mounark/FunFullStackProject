import type { DailyStat } from '@takehome/shared';
import { Sparkline } from '../chart/Sparkline';
import { formatCompact, formatPrice, formatVolume } from '../format';
import { summarize } from '../summary';

/** Four headline figures for the month, with a sparkline of the daily values behind each. */
export function SummaryTiles({ stats }: { stats: DailyStat[] }) {
  const summary = summarize(stats);
  return (
    <dl className="tiles" aria-label="Month summary">
      <div className="tile">
        <dt>Trading days</dt>
        <dd>{summary.tradingDays}</dd>
      </div>
      <div className="tile">
        <dt>Average low</dt>
        <dd>{formatPrice(summary.averageLow)}</dd>
        <Sparkline values={stats.map((s) => s.lowAverage)} className="series-low" />
      </div>
      <div className="tile">
        <dt>Average high</dt>
        <dd>{formatPrice(summary.averageHigh)}</dd>
        <Sparkline values={stats.map((s) => s.highAverage)} className="series-high" />
      </div>
      <div className="tile">
        <dt>Total volume</dt>
        <dd title={formatVolume(summary.totalVolume)}>{formatCompact(summary.totalVolume)}</dd>
        <Sparkline values={stats.map((s) => s.volume)} className="series-volume" />
      </div>
    </dl>
  );
}
