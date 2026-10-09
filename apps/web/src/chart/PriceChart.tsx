import type { DailyStat } from '@takehome/shared';
import { useId, useState, type PointerEvent } from 'react';
import { formatPrice, formatWeekday } from '../format';
import { ChartAxes } from './ChartAxes';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { HEIGHT, indexAtX, PLOT, WIDTH, xCenter } from './geometry';
import { endLabelY, niceScale, scaleLinear } from './scale';

const LEGEND = [
  { label: 'Low average', className: 'series-low' },
  { label: 'High average', className: 'series-high' },
];

/** Line chart of the daily low and high averages, with a crosshair and tooltip on hover. */
export function PriceChart({ stats }: { stats: DailyStat[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = `area-${useId().replace(/:/g, '')}`;
  const count = stats.length;

  const { ticks, min, max } = niceScale(
    Math.min(...stats.map((s) => s.lowAverage)),
    Math.max(...stats.map((s) => s.highAverage)),
  );
  const yOf = scaleLinear([min, max], [PLOT.bottom, PLOT.top]);
  const line = (pick: (s: DailyStat) => number) =>
    stats.map((s, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i, count)},${yOf(pick(s))}`).join(' ');

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    setHover(indexAtX(((event.clientX - rect.left) / rect.width) * WIDTH, count));
  }

  const last = count - 1;
  const end = stats[last];
  const highLine = line((s) => s.highAverage);
  const area = `${highLine} L${xCenter(last, count)},${PLOT.bottom} L${xCenter(0, count)},${PLOT.bottom} Z`;
  const hovered = hover === null ? undefined : stats[hover];

  return (
    <ChartCard title="Average price" legend={LEGEND}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Line chart of the daily low and high average price"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="area-stop-top" />
            <stop offset="1" className="area-stop-bottom" />
          </linearGradient>
        </defs>
        <ChartAxes ticks={ticks} yOf={yOf} formatTick={formatPrice} days={stats.map((s) => s.day)} />
        {hover !== null && (
          <line className="crosshair" x1={xCenter(hover, count)} x2={xCenter(hover, count)} y1={PLOT.top} y2={PLOT.bottom} />
        )}
        <path className="area" d={area} fill={`url(#${gradientId})`} />
        <path className="line series-low" pathLength={1} d={line((s) => s.lowAverage)} />
        <path className="line series-high" pathLength={1} d={highLine} />
        {end && (
          <>
            <circle className="dot series-low" cx={xCenter(last, count)} cy={yOf(end.lowAverage)} r={4} />
            <circle className="dot series-high" cx={xCenter(last, count)} cy={yOf(end.highAverage)} r={4} />
            <text className="end-label" x={xCenter(last, count)} y={endLabelY(yOf(end.highAverage), 'above', PLOT)} textAnchor="end">
              {formatPrice(end.highAverage)}
            </text>
            <text className="end-label" x={xCenter(last, count)} y={endLabelY(yOf(end.lowAverage), 'below', PLOT)} textAnchor="end">
              {formatPrice(end.lowAverage)}
            </text>
          </>
        )}
        {hover !== null && hovered && hover !== last && (
          <>
            <circle className="dot series-low" cx={xCenter(hover, count)} cy={yOf(hovered.lowAverage)} r={4} />
            <circle className="dot series-high" cx={xCenter(hover, count)} cy={yOf(hovered.highAverage)} r={4} />
          </>
        )}
      </svg>
      {hover !== null && hovered && (
        <ChartTooltip
          x={xCenter(hover, count)}
          title={formatWeekday(hovered.day)}
          rows={[
            { label: 'High average', value: formatPrice(hovered.highAverage), className: 'series-high' },
            { label: 'Low average', value: formatPrice(hovered.lowAverage), className: 'series-low' },
          ]}
        />
      )}
    </ChartCard>
  );
}
