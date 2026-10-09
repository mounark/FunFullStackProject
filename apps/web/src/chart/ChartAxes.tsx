import { formatDay } from '../format';
import { PLOT, xCenter } from './geometry';
import { xTickIndexes } from './scale';

interface Props {
  ticks: number[];
  yOf: (value: number) => number;
  formatTick: (value: number) => string;
  days: string[];
}

/** Hairline gridlines, the y tick labels, the baseline and the thinned x day labels. */
export function ChartAxes({ ticks, yOf, formatTick, days }: Props) {
  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="grid" x1={PLOT.left} x2={PLOT.right} y1={yOf(tick)} y2={yOf(tick)} />
          <text className="tick" x={PLOT.left - 8} y={yOf(tick)} textAnchor="end" dominantBaseline="middle">
            {formatTick(tick)}
          </text>
        </g>
      ))}
      <line className="baseline" x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
      {xTickIndexes(days.length).map((i) => (
        <text key={days[i]} className="tick" x={xCenter(i, days.length)} y={PLOT.bottom + 18} textAnchor="middle">
          {formatDay(days[i] ?? '')}
        </text>
      ))}
    </g>
  );
}
