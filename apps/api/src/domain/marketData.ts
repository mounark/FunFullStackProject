/** One 15-minute bar. Null means Yahoo had no value for it. */
export interface Bar {
  timestamp: number; // epoch seconds of the bar start
  low: number | null;
  high: number | null;
  volume: number | null;
}

/** What a provider returns: the raw bars, still containing any null values. */
export interface MarketData {
  bars: Bar[];
}

/** The month being requested, with the exact Yahoo `period1`/`period2` boundaries for it. */
export interface MonthWindow {
  month: string; // YYYY-MM, in America/New_York
  period1: number; // epoch seconds, UTC midnight of the 1st of the month
  period2: number; // epoch seconds, UTC midnight of the 1st of the next month
}
