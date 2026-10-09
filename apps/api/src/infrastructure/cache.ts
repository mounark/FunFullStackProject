import type { Cache, Clock } from '../domain/ports';

/** In-process cache whose entries expire `ttlMs` after being set. Expired entries are dropped on read. */
export class InMemoryTtlCache<V> implements Cache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly clock: Clock,
  ) {}

  /** The stored value, or `undefined` if missing or expired. */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.clock.now().getTime() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Stores `value`, replacing any existing entry and restarting its TTL. */
  set(key: string, value: V): void {
    this.entries.set(key, { value, expiresAt: this.clock.now().getTime() + this.ttlMs });
  }
}
