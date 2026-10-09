import { CalendarDays, TrendingUp } from 'lucide-react';

/** Page header: what the app is, and which month the numbers cover. */
export function Hero({ month }: { month: string | null }) {
  return (
    <header className="hero">
      <div className="hero-inner">
        <span className="logo">
          <TrendingUp size={24} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div>
          <h1>Monthly Market Snapshot</h1>
          <p className="subtitle">
            Daily low and high averages and trading volume for any US stock, from 15-minute bars.
          </p>
        </div>
        <p className="badge">
          <CalendarDays size={18} aria-hidden="true" />
          {month ?? 'Last calendar month'}
        </p>
      </div>
    </header>
  );
}
