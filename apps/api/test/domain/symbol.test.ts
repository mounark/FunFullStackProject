import { describe, expect, it } from 'vitest';
import { InvalidSymbolError } from '../../src/domain/errors';
import { normalizeSymbol } from '../../src/domain/symbol';

describe('normalizeSymbol', () => {
  it.each([
    ['tsla', 'TSLA'],
    [' aapl ', 'AAPL'],
    ['BRK-B', 'BRK-B'],
    ['BRK.B', 'BRK.B'],
  ])('accepts %j as %s', (raw, expected) => {
    expect(normalizeSymbol(raw)).toBe(expected);
  });

  it.each(['^GSPC', 'ES=F', '..', '.A', '-A', '1ABC', '', 'A'.repeat(16)])(
    'rejects %j',
    (raw) => {
      expect(() => normalizeSymbol(raw)).toThrow(InvalidSymbolError);
    },
  );

  it('accepts the 15-character maximum', () => {
    expect(normalizeSymbol('a'.repeat(15))).toBe('A'.repeat(15));
  });
});
