import { WIDTH } from './geometry';

interface Props {
  /** Viewbox x the tooltip points at. */
  x: number;
  title: string;
  rows: { label: string; value: string; className: string }[];
}

/** Hover readout: values lead, series names follow, each keyed by a short line in the series color. */
export function ChartTooltip({ x, title, rows }: Props) {
  const flip = x > WIDTH / 2;
  return (
    <div className={`tooltip${flip ? ' tooltip-flip' : ''}`} style={{ left: `${(x / WIDTH) * 100}%` }}>
      <div className="tooltip-title">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="tooltip-row">
          <span className={`tooltip-key ${row.className}`} aria-hidden="true" />
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}
