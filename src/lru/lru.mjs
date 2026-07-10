// LRU cache — bounded, Map-backed recency, with optional lazy-TTL expiry.
// Pure stdlib, zero runtime dependencies. Node.js v24+ (native ESM, JSDoc types),
// matching the self-contained module shape of src/slug/, src/unicode/, src/flags/.
//
// Design:
//   - A single `Map` is the store AND the recency order: JS Maps preserve
//     insertion order, so the FIRST key is the least-recently-used (LRU) and the
//     LAST is the most-recently-used (MRU). Promoting a key = delete + re-insert
//     (moves it to the tail). Eviction removes the head key.
//   - Optional TTL uses LAZY purging: an expired entry stays in the Map until the
//     next access that observes it (get/set-overwrite/has/peek/delete/size), at
//     which point it is dropped and reported as absent. No timers, no background
//     sweep — keeps the module pure of the event loop and trivially testable.
//   - Time is read through an injectable `clock` (defaults to `Date.now`) so TTL
//     behavior is deterministic under test without fake timers or third-party deps.
//
// Semantics summary:
//   - `get`  : returns value + PROMOTES recency; expired/missing => undefined.
//   - `set`  : insert/overwrite at MRU, refreshes TTL, evicts LRU past `max`.
//   - `has`  : liveness check, does NOT promote recency.
//   - `peek` : read value WITHOUT promoting recency (the point of peek vs get).
//   - `delete`: remove a live key (true) — a lazily-expired key reports as absent (false).
//   - `clear`: drop everything.
//   - `size` : truthful count of LIVE entries (purges expired first when TTL is on).
//
// A stored value of `undefined` is legal; `get` then returns undefined for both a
// present-undefined and a missing key, so use `has` to disambiguate.

/**
 * Create a bounded LRU cache.
 *
 * @param {{ max: number, ttl?: number, clock?: () => number }} options
 *   - `max` (required): positive integer capacity (number of entries).
 *   - `ttl` (optional): positive, finite milliseconds. When set, an entry is
 *     considered expired once `clock()` reaches its insertion time + `ttl`
 *     (expiry is inclusive: at exactly +ttl the entry is gone).
 *   - `clock` (optional, default `Date.now`): returns "now" in ms. Injectable
 *     for deterministic TTL tests.
 * @returns {{
 *   get(key: any): any, set(key: any, value: any): object, has(key: any): boolean,
 *   peek(key: any): any, delete(key: any): boolean, clear(): void, readonly size: number
 * }} the cache. Methods are closure-bound (safe to destructure — no `this`).
 */
export function createLRU(options = {}) {
  const { max, ttl, clock = Date.now } = options;

  if (!Number.isInteger(max) || max <= 0) {
    throw new TypeError(
      `createLRU: "max" must be a positive integer, got ${stringify(max)}`,
    );
  }
  const bounded = ttl !== undefined && ttl !== null;
  if (bounded && (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl <= 0)) {
    throw new TypeError(
      `createLRU: "ttl" must be a positive finite number of ms when provided, got ${stringify(ttl)}`,
    );
  }
  if (typeof clock !== "function") {
    throw new TypeError(
      `createLRU: "clock" must be a function returning ms, got ${typeof clock}`,
    );
  }

  // key -> { value, expires }.  expires is Infinity when TTL is off.
  const store = new Map();

  const isLive = (entry, now) => entry.expires > now;

  // Return the live entry for `key`, lazily purging it if expired.
  function liveEntry(key) {
    const entry = store.get(key);
    if (entry === undefined) return undefined;
    if (bounded && !isLive(entry, clock())) {
      store.delete(key);
      return undefined;
    }
    return entry;
  }

  const cache = {
    get(key) {
      const entry = liveEntry(key);
      if (entry === undefined) return undefined;
      // Promote to MRU: re-insert moves the key to the Map tail.
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },

    set(key, value) {
      // Drop any existing slot so the re-insert lands at the MRU tail and, with
      // TTL, the expiry window is refreshed from now.
      store.delete(key);
      store.set(key, { value, expires: bounded ? clock() + ttl : Infinity });
      // Evict the least-recently-used (Map head) while over capacity.
      while (store.size > max) {
        store.delete(store.keys().next().value);
      }
      return cache;
    },

    has(key) {
      // Liveness check only — does NOT promote recency.
      return liveEntry(key) !== undefined;
    },

    peek(key) {
      // Read WITHOUT promoting recency.
      const entry = liveEntry(key);
      return entry === undefined ? undefined : entry.value;
    },

    delete(key) {
      // A lazily-expired key counts as already absent.
      if (liveEntry(key) === undefined) return false;
      return store.delete(key);
    },

    clear() {
      store.clear();
    },

    get size() {
      // Truthful live count: purge any expired entries first when TTL is active.
      if (bounded) {
        const now = clock();
        for (const [key, entry] of store) {
          if (!isLive(entry, now)) store.delete(key);
        }
      }
      return store.size;
    },
  };

  return cache;
}

/** Compact value description for error messages (quotes strings, stringifies rest). */
function stringify(v) {
  return typeof v === "string" ? JSON.stringify(v) : String(v);
}
