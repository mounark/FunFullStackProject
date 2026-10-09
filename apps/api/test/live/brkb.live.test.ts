import { mkdirSync, writeFileSync } from 'node:fs';
import { dailyStatSchema } from '@takehome/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp } from '../../src/app';
import { loadConfig } from '../../src/config';
import { targetMonthWindow } from '../../src/domain/window';

// No ground-truth file exists for BRK-B, so this checks shape and invariants, not exact values.
describe('live: GET /api/stocks/BRK-B/daily-stats', () => {
  it('returns well-formed stats for last month using real Yahoo data and the real clock', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent', UPSTREAM_RETRIES: '0' }) });

    const res = await app.inject('/api/stocks/brk-b/daily-stats');

    // Saved for manual inspection; the folder is gitignored.
    const outDir = new URL('./output/', import.meta.url);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(new URL('brkb-live-response.json', outDir), JSON.stringify(res.json(), null, 2));

    expect(res.statusCode).toBe(200);
    const stats = z.array(dailyStatSchema.strict()).parse(res.json());
    const days = stats.map((s) => s.day);
    const { month } = targetMonthWindow(new Date());

    expect(stats.length).toBeGreaterThan(0);
    expect(days.every((d) => d.startsWith(`${month}-`))).toBe(true);
    expect(days).toEqual([...days].sort());
    expect(new Set(days).size).toBe(days.length);
    for (const s of stats) {
      expect(s.lowAverage).toBeGreaterThan(0);
      expect(s.highAverage).toBeGreaterThanOrEqual(s.lowAverage);
      expect(s.volume).toBeGreaterThanOrEqual(0);
    }
  });
});
