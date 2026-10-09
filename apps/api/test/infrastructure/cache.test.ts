import { describe, expect, it } from 'vitest';
import type { Clock } from '../../src/domain/ports';
import { InMemoryTtlCache } from '../../src/infrastructure/cache';

const fakeClock = (start: number) => {
  let t = start;
  const clock: Clock = { now: () => new Date(t) };
  return { clock, advance: (ms: number) => (t += ms) };
};

describe('InMemoryTtlCache', () => {
  it('returns undefined for a missing key', () => {
    expect(new InMemoryTtlCache<number>(1000, fakeClock(0).clock).get('x')).toBeUndefined();
  });

  it('returns a stored value until the TTL elapses', () => {
    const { clock, advance } = fakeClock(0);
    const cache = new InMemoryTtlCache<number>(1000, clock);
    cache.set('x', 1);
    advance(999);
    expect(cache.get('x')).toBe(1);
    advance(1);
    expect(cache.get('x')).toBeUndefined();
  });
});
