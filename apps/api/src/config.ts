import { z } from 'zod';

/** Environment variables and their defaults. */
const configSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  UPSTREAM_RETRIES: z.coerce.number().int().min(0).default(1),
  UPSTREAM_BACKOFF_MS: z.coerce.number().int().min(0).default(60_000),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(24 * 60 * 60 * 1000),
});

/** Validated, typed settings handed to `buildApp`. */
export interface Config {
  port: number;
  host: string;
  logLevel: string;
  upstreamTimeoutMs: number;
  upstreamRetries: number;
  upstreamBackoffMs: number;
  cacheTtlMs: number;
}

/** Validates the environment once, at startup. Throws a ZodError on bad values. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const e = configSchema.parse(env);
  return {
    port: e.PORT,
    host: e.HOST,
    logLevel: e.LOG_LEVEL,
    upstreamTimeoutMs: e.UPSTREAM_TIMEOUT_MS,
    upstreamRetries: e.UPSTREAM_RETRIES,
    upstreamBackoffMs: e.UPSTREAM_BACKOFF_MS,
    cacheTtlMs: e.CACHE_TTL_MS,
  };
}
