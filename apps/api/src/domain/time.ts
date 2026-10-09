/** The only exchange time zone we support; all grouping and month logic uses it. */
export const MARKET_TIME_ZONE = 'America/New_York';

/** Reused formatter: building an `Intl.DateTimeFormat` is comparatively expensive. */
const etParts = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** A calendar date as seen on the wall clock in America/New_York. */
export interface EtDate {
  year: number;
  month: number;
  day: number;
}

/** The America/New_York calendar date of `instant`, derived with `Intl` (never a fixed offset). */
export function etDate(instant: Date): EtDate {
  const parts = etParts.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Left-pads a number with zeros to `width` digits. */
const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `YYYY-MM-DD` of an epoch-seconds instant, in America/New_York. */
export function etDay(epochSeconds: number): string {
  const { year, month, day } = etDate(new Date(epochSeconds * 1000));
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}
