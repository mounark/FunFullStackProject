import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { loadConfig } from '../../src/config';
import { targetMonthWindow } from '../../src/domain/window';

const GROUND_TRUTH_MONTH = '2026-09';
const expected = JSON.parse(
  readFileSync(new URL('../fixtures/expected/cvr-2026-09-daily-stats.json', import.meta.url), 'utf8'),
);

// The expected file is only valid while "last month" is September 2026.
const applicable = targetMonthWindow(new Date()).month === GROUND_TRUTH_MONTH;

describe('live: GET /api/stocks/CVR/daily-stats', () => {
  it.skipIf(!applicable)('matches the CVR ground truth using real Yahoo data and the real clock', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent', UPSTREAM_RETRIES: '0' }) });

    const res = await app.inject('/api/stocks/cvr/daily-stats');

    // Saved for manual inspection; the folder is gitignored.
    const outDir = new URL('./output/', import.meta.url);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(new URL('cvr-live-response.json', outDir), JSON.stringify(res.json(), null, 2));

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expected);
  });
});
