import type { ReactNode } from 'react';

interface Props {
  title: string;
  legend?: { label: string; className: string }[];
  children: ReactNode;
}

/** The frame around a chart: title, an optional legend (for two or more series), and the plot. */
export function ChartCard({ title, legend, children }: Props) {
  return (
    <section className="card">
      <div className="card-header">
        <h3>{title}</h3>
        {legend && (
          <ul className="legend" aria-label="Legend">
            {legend.map((item) => (
              <li key={item.label}>
                <span className={`legend-key ${item.className}`} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="plot">{children}</div>
    </section>
  );
}
