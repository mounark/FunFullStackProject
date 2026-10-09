import { defineConfig } from 'vitest/config';

// Opt-in: hits the real Yahoo Finance. Run with `pnpm --filter api test:live`.
export default defineConfig({
  test: { include: ['test/live/**/*.live.test.ts'], testTimeout: 30_000 },
});
