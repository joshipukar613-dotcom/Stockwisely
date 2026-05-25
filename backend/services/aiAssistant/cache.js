/**
 * cache.js — In-memory TTL cache for AI assistant
 *
 * Improvements:
 *  - has() method for explicit existence check
 *  - size() for monitoring
 *  - clear() for cache invalidation
 *  - Automatic stale-entry pruning on every set() to avoid memory leaks
 */

class TTLCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    const ttl = Math.max(0, Number(ttlMs) || 0);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
    // Prune expired entries periodically (every 50 sets)
    if (this.store.size % 50 === 0) this._prune();
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }

  _prune() {
    const now = Date.now();
    for (const [k, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(k);
    }
  }
}

const cache = new TTLCache();

module.exports = { cache, TTLCache };
