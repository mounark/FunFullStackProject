import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

interface Props {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (symbol: string) => void;
}

/** The ticker input and submit button. The typed text is owned by the parent, so example chips can fill it. */
export function SymbolForm({ value, busy, onChange, onSubmit }: Props) {
  const blank = value.trim() === '';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!blank) onSubmit(value);
  }

  return (
    <form className="symbol-form" onSubmit={handleSubmit}>
      <label htmlFor="ticker">Ticker</label>
      <div className="input-wrap">
        <Search className="input-icon" size={18} aria-hidden="true" />
        <input
          id="ticker"
          aria-describedby="ticker-hint"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. TSLA"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>
      <button type="submit" disabled={blank || busy}>
        {busy ? 'Loading…' : 'Get stats'}
      </button>
      <p id="ticker-hint" className="hint">
        US-listed stocks only, for example TSLA or BRK-B. Indices, futures and FX are not supported.
      </p>
    </form>
  );
}
