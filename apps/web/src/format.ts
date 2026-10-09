const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** `YYYY-MM-DD` as a UTC date, so the calendar day never shifts with the viewer's time zone. */
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** "Sep 1" */
export const formatDay = (day: string) => dayFormat.format(utc(day));

/** "Tue, Sep 1" */
export const formatWeekday = (day: string) => weekdayFormat.format(utc(day));

/** "September 2026" */
export const formatMonth = (day: string) => monthFormat.format(utc(day));

/** Two to four decimals, matching the API's four-decimal precision without trailing noise. */
export const formatPrice = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** "31,404,037" */
export const formatVolume = (value: number) => value.toLocaleString('en-US');

/** "31.4M", for axis ticks. */
export const formatCompact = (value: number) => compactFormat.format(value);
