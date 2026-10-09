import { sparklinePoints } from './scale';

interface Props {
  values: number[];
  /** Series color class, e.g. `series-low`. */
  className: string;
}

/** A tiny trend line with no axes; the exact numbers live in the charts and table. */
export function Sparkline({ values, className }: Props) {
  const points = sparklinePoints(values, 100, 28);
  if (!points) return null;
  return (
    <svg className={`spark ${className}`} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline className="spark-line" points={points} />
    </svg>
  );
}
