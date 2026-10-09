import { describe, expect, it } from 'vitest';
import { etDay } from '../../src/domain/time';
import { targetMonthWindow } from '../../src/domain/window';

describe('targetMonthWindow', () => {
  it('returns the previous month as UTC-midnight boundaries', () => {
    expect(targetMonthWindow(new Date('2026-10-01T12:00:00-04:00'))).toEqual({
      month: '2026-09',
      period1: 1788220800,
      period2: 1790812800,
    });
  });

  it('rolls back across the year boundary', () => {
    const w = targetMonthWindow(new Date('2027-01-15T12:00:00Z'));
    expect(w.month).toBe('2026-12');
    expect(w.period1).toBe(Date.UTC(2026, 11, 1) / 1000);
    expect(w.period2).toBe(Date.UTC(2027, 0, 1) / 1000);
  });

  it('still sees September in ET at 03:59Z on Oct 1 (month rolls at midnight ET)', () => {
    expect(targetMonthWindow(new Date('2026-10-01T03:59:00Z')).month).toBe('2026-08');
  });

  it('sees October in ET from 04:00Z on Oct 1 (EDT midnight)', () => {
    expect(targetMonthWindow(new Date('2026-10-01T04:00:00Z')).month).toBe('2026-09');
  });

  it('uses EST offsets in winter (05:00Z is midnight ET on Dec 1)', () => {
    expect(targetMonthWindow(new Date('2026-12-01T04:59:00Z')).month).toBe('2026-10');
    expect(targetMonthWindow(new Date('2026-12-01T05:00:00Z')).month).toBe('2026-11');
  });
});

describe('etDay', () => {
  it('groups by the America/New_York calendar date', () => {
    expect(etDay(Date.parse('2026-09-30T23:59:00-04:00') / 1000)).toBe('2026-09-30');
    expect(etDay(Date.parse('2026-10-01T03:59:00Z') / 1000)).toBe('2026-09-30');
    expect(etDay(Date.parse('2026-10-01T04:00:00Z') / 1000)).toBe('2026-10-01');
  });
});
