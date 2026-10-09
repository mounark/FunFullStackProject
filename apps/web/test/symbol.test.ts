import { describe, expect, it } from 'vitest';
import { isValidSymbol, normalizeSymbol } from '../src/symbol';

describe('normalizeSymbol', () => {
  it('trims and uppercases', () => {
    expect(normalizeSymbol(' aapl ')).toBe('AAPL');
  });
});

describe('isValidSymbol', () => {
  it.each(['TSLA', 'BRK-B', 'BRK.B', 'A', 'A'.repeat(15)])('accepts %j', (symbol) => {
    expect(isValidSymbol(symbol)).toBe(true);
  });

  it.each(['^GSPC', 'ES=F', '..', '.A', '-A', '1ABC', '', 'A'.repeat(16), 'BR K', 'tsla'])(
    'rejects %j',
    (symbol) => {
      expect(isValidSymbol(symbol)).toBe(false);
    },
  );
});
