import type { DailyStat } from '@takehome/shared';
import { formatDay, formatPrice, formatVolume } from '../format';

/** The exact numbers behind the charts, one row per trading day, with volume as an in-cell bar. */
export function StatsTable({ stats }: { stats: DailyStat[] }) {
  const maxVolume = Math.max(...stats.map((s) => s.volume));
  return (
    <div className="table-scroll">
      <table>
        <caption className="visually-hidden">Daily statistics</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Low average</th>
            <th scope="col">High average</th>
            <th scope="col">Volume</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.day}>
              <th scope="row">{formatDay(stat.day)}</th>
              <td>{formatPrice(stat.lowAverage)}</td>
              <td>{formatPrice(stat.highAverage)}</td>
              <td className="volume-cell">
                <span
                  className="volume-bar"
                  style={{ width: `${maxVolume === 0 ? 0 : (stat.volume / maxVolume) * 100}%` }}
                  aria-hidden="true"
                />
                <span className="volume-value">{formatVolume(stat.volume)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
