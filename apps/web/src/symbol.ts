// Mirrors the API's symbol rule (apps/api/src/domain/symbol.ts), which stays as the server-side failsafe.
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/** Message shown for a ticker the browser rejects. */
export const INVALID_SYMBOL_MESSAGE =
  'Enter a US stock ticker: a letter followed by letters, digits, "." or "-", up to 15 characters. ' +
  'Indices, futures and FX symbols such as ^GSPC or ES=F are not supported.';

/** Trims and uppercases what the user typed. */
export const normalizeSymbol = (raw: string) => raw.trim().toUpperCase();

/** Whether a normalized symbol is a plain US stock ticker. */
export const isValidSymbol = (symbol: string) => SYMBOL_PATTERN.test(symbol);
