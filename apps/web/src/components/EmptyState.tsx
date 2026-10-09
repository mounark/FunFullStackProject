import { Banknote, ChartColumn, CircleDollarSign, Coins, Download, Search } from 'lucide-react';
import { GhostChart } from './GhostChart';

const EXAMPLES = ['TSLA', 'AAPL', 'BRK-B'];

/** What the page shows before the first search: a preview, a prompt, example tickers and the three steps. */
export function EmptyState({ onPick }: { onPick: (symbol: string) => void }) {
  return (
    <section className="empty">
      <div className="empty-art" aria-hidden="true">
        <GhostChart />
        <div className="coins">
          <Banknote size={30} strokeWidth={1.75} />
          <CircleDollarSign size={38} strokeWidth={1.75} />
          <Coins size={30} strokeWidth={1.75} />
        </div>
      </div>
      <p className="empty-prompt">Enter a US stock ticker to see last month's daily stats.</p>
      <ul className="chips" aria-label="Example tickers">
        {EXAMPLES.map((symbol) => (
          <li key={symbol}>
            <button type="button" className="chip" onClick={() => onPick(symbol)}>
              {symbol}
            </button>
          </li>
        ))}
      </ul>
      <ol className="steps" aria-label="How it works">
        <li>
          <Search size={20} aria-hidden="true" />
          <strong>Enter a ticker</strong>
          <span>Any US-listed stock, like TSLA or BRK-B.</span>
        </li>
        <li>
          <Download size={20} aria-hidden="true" />
          <strong>We fetch last month</strong>
          <span>15-minute bars from Yahoo Finance, grouped by New York trading day.</span>
        </li>
        <li>
          <ChartColumn size={20} aria-hidden="true" />
          <strong>See the snapshot</strong>
          <span>Summary tiles, price and volume charts, and a table.</span>
        </li>
      </ol>
    </section>
  );
}
