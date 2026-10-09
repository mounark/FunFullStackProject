import { z } from 'zod';

/** A price or volume array aligned with `timestamp`; Yahoo uses null for missing values. */
const series = z.array(z.number().nullable());

/** One `chart.result` entry. Quote arrays and `timestamp` are optional because Yahoo omits them when there is no data. */
const yahooResult = z.object({
  meta: z.object({ exchangeTimezoneName: z.string() }),
  timestamp: z.array(z.number()).optional(),
  indicators: z.object({
    quote: z.array(
      z.object({
        low: series.optional(),
        high: series.optional(),
        volume: series.optional(),
      }),
    ),
  }),
});

/** The full Yahoo chart response; validated at the boundary before anything else reads it. */
export const yahooChartResponse = z.object({
  chart: z.object({
    result: z.array(yahooResult).nullable(),
    error: z.object({ code: z.string(), description: z.string() }).nullable(),
  }),
});

export type YahooResult = z.infer<typeof yahooResult>;
