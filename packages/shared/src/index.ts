import { z } from 'zod';

export const dailyStatSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lowAverage: z.number(),
  highAverage: z.number(),
  volume: z.number(),
});

export type DailyStat = z.infer<typeof dailyStatSchema>;
