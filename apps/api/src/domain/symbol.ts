import { InvalidSymbolError } from './errors';

/** A letter first, then letters, digits, `.` or `-`; 15 characters at most. Rejects indices, futures and FX. */
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/** Trims and uppercases `raw`, returning the ticker or throwing `InvalidSymbolError`. */
export function normalizeSymbol(raw: string): string {
  const symbol = raw.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) throw new InvalidSymbolError({ raw });
  return symbol;
}
