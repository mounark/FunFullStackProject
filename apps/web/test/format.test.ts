import { describe, expect, it } from 'vitest';
import { formatCompact, formatDay, formatMonth, formatPrice, formatVolume, formatWeekday } from '../src/format';

describe('format', () => {
  it('formats days without time zone drift', () => {
    expect(formatDay('2026-09-01')).toBe('Sep 1');
    expect(formatWeekday('2026-09-01')).toBe('Tue, Sep 1');
    expect(formatMonth('2026-09-01')).toBe('September 2026');
  });

  it('shows prices with 2 to 4 decimals', () => {
    expect(formatPrice(370.5)).toBe('370.50');
    expect(formatPrice(356.1709)).toBe('356.1709');
  });

  it('formats volume with separators, and compactly for axes', () => {
    expect(formatVolume(31404037)).toBe('31,404,037');
    expect(formatCompact(31404037)).toBe('31.4M');
    expect(formatCompact(0)).toBe('0');
  });
});
