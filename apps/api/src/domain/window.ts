import type { MonthWindow } from './marketData';
import { etDate } from './time';

/** The previous calendar month in America/New_York, as Yahoo period boundaries. */
/**
 * The previous calendar month relative to `now`, read in America/New_York, so the month
 * rolls over at midnight ET. Boundaries are UTC midnights with no padding.
 */
export function targetMonthWindow(now: Date): MonthWindow {
  const { year, month } = etDate(now);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return {
    month: `${String(prevYear).padStart(4, '0')}-${String(prevMonth).padStart(2, '0')}`,
    period1: Date.UTC(prevYear, prevMonth - 1, 1) / 1000,
    period2: Date.UTC(year, month - 1, 1) / 1000,
  };
}
