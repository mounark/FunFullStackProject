import type { DailyStat } from '@takehome/shared';
import { useState } from 'react';
import { formatCompact, formatDay, formatVolume, formatWeekday } from '../format';
import { ChartAxes } from './ChartAxes';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { bandWidth, HEIGHT, PLOT, WIDTH, xCenter } from './geometry';
import { columnPath, niceScale, scaleLinear } from './scale';

const MAX_BAR_WIDTH = 24;

/** Column chart of daily volume. Each column is its own hover and focus target. */
export function VolumeChart({ stats }: { stats: DailyStat[] }) {
  const [active, setActive] = useState<number | null>(null);
  const count = stats.length;

  const { ticks, max } = niceScale(0, Math.max(...stats.map((s) => s.volume)));
  const yOf = scaleLinear([0, max], [PLOT.bottom, PLOT.top]);
  const band = bandWidth(count);
  const hovered = active === null ? undefined : stats[active];
  const barWidth = Math.min(MAX_BAR_WIDTH, band - 4);

  return (
    <ChartCard title="Volume">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Column chart of daily volume">
        <ChartAxes ticks={ticks} yOf={yOf} formatTick={formatCompact} days={stats.map((s) => s.day)} />
        {stats.map((stat, i) => (
          <g key={stat.day}>
            <path
              className={`bar${active === i ? ' bar-active' : ''}`}
              style={{ animationDelay: `${0.3 + i * 0.025}s` }}
              d={columnPath(xCenter(i, count) - barWidth / 2, yOf(stat.volume), barWidth, PLOT.bottom - yOf(stat.volume))}
            />
            <rect
              className="hit"
              x={PLOT.left + i * band}
              y={PLOT.top}
              width={band}
              height={PLOT.bottom - PLOT.top}
              tabIndex={0}
              aria-label={`${formatDay(stat.day)}: ${formatVolume(stat.volume)} shares`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
      {active !== null && hovered && (
        <ChartTooltip
          x={xCenter(active, count)}
          title={formatWeekday(hovered.day)}
          rows={[{ label: 'Volume', value: formatVolume(hovered.volume), className: 'series-volume' }]}
        />
      )}
    </ChartCard>
  );
}
