# lru

A bounded, **zero-dependency** LRU (least-recently-used) cache for Node v24+
(native ESM, typed via JSDoc). Map-backed recency with optional lazy TTL expiry.
Follows the self-contained module shape established by [`src/slug/`](../slug/),
[`src/unicode/`](../unicode/), and [`src/flags/`](../flags/) and the conventions
fixed in [`CONTEXT.md`](../../CONTEXT.md).

## API

```js
import { createLRU } from "./lru.mjs";

const cache = createLRU({ max: 3 });

cache.set("a", 1);
cache.set("b", 2);
cache.get("a");        // 1   (and promotes "a" to most-recently-used)
cache.has("b");        // true  (does NOT change recency)
cache.peek("b");       // 2     (reads WITHOUT changing recency)
cache.set("c", 3);
cache.set("d", 4);     // over capacity -> evicts the LRU key ("b")
cache.has("b");        // false
cache.size;            // 3
cache.delete("a");     // true
cache.clear();
```

### `createLRU(options) -> cache`

| option | required | meaning |
| --- | --- | --- |
| `max` | yes | positive integer capacity (number of entries) |
| `ttl` | no | positive, finite milliseconds; entries expire at insertion-time `+ ttl` |
| `clock` | no | `() => number` returning "now" in ms (default `Date.now`); injectable for tests |

### Methods

| method | effect | recency |
| --- | --- | --- |
| `get(key)` | value, or `undefined` if missing/expired | **promotes** to MRU |
| `set(key, value)` | insert/overwrite; refreshes TTL; evicts LRU past `max`; returns the cache (chainable) | **promotes** to MRU |
| `has(key)` | `true` if present and not expired | unchanged |
| `peek(key)` | value without promoting, or `undefined` | unchanged |
| `delete(key)` | `true` if a live key was removed, else `false` | n/a |
| `clear()` | drop all entries | n/a |
| `size` (getter) | count of **live** entries (purges expired first) | n/a |

## Behavior

- **Recency = Map order.** A single `Map` is both the store and the recency
  list: the head key is the LRU, the tail is the MRU. `get`/`set` re-insert to
  promote; eviction removes the head.
- **Lazy TTL.** No timers or background sweeps. An expired entry lingers until an
  access observes it, then it is purged and reported absent. `size` purges all
  expired entries so its count is truthful.
- **Injectable clock.** TTL reads time through `clock` (default `Date.now`),
  making expiry deterministic under test without fake timers or dependencies.
- **`undefined` values are legal.** `get` then returns `undefined` for both a
  stored-undefined and a missing key — use `has` to disambiguate.
- **Fail-fast construction.** A non-positive-integer `max`, a non-positive or
  non-finite `ttl`, or a non-function `clock` throws `TypeError` at creation.

## Test

```sh
cd src/lru && npm test      # node --test (zero deps)
```

Eviction/recency expectations live once in [`fixtures.mjs`](./fixtures.mjs); the
suite in [`__tests__/lru.test.mjs`](./__tests__/lru.test.mjs) is table-driven
over those scenarios plus direct TTL (via an injected clock) and construction-
validation cases.
