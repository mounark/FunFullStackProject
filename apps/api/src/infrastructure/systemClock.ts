import type { Clock } from '../domain/ports';

/** The real clock, used in production. */
export const systemClock: Clock = { now: () => new Date() };
