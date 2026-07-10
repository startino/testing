// Co-located test suite for the LRU cache module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (from this module dir):  npm test   (alias for `node --test`).
//
// NOTE: `node --test <DIRECTORY>` FAILS on Node 24 with MODULE_NOT_FOUND. Use
// bare `node --test` (cwd auto-discovery of *.test.mjs), an explicit glob, or an
// explicit file path — never a bare directory argument.
//
// Every eviction/recency expectation lives ONCE in ../fixtures.mjs; TTL and
// validation cases are asserted directly here (a clock function / thrown error
// does not fit the table-of-values shape).

import test from "node:test";
import assert from "node:assert/strict";

import { SCENARIOS } from "../fixtures.mjs";
import { createLRU } from "../lru.mjs";

const APPLY = {
  set: (c, [, k, v]) => c.set(k, v),
  get: (c, [, k]) => c.get(k),
  has: (c, [, k]) => c.has(k),
  peek: (c, [, k]) => c.peek(k),
  delete: (c, [, k]) => c.delete(k),
};

// Table-driven eviction/recency scenarios.
for (const s of SCENARIOS) {
  test(`scenario: ${s.name}`, () => {
    const cache = createLRU({ max: s.max });
    for (const op of s.ops) APPLY[op[0]](cache, op);
    for (const k of s.present) assert.equal(cache.has(k), true, `expected ${k} present`);
    for (const k of s.absent) assert.equal(cache.has(k), false, `expected ${k} absent`);
    assert.equal(cache.size, s.size);
  });
}

test("get returns undefined for a missing key", () => {
  const cache = createLRU({ max: 2 });
  assert.equal(cache.get("nope"), undefined);
});

test("set returns the cache for chaining", () => {
  const cache = createLRU({ max: 2 });
  assert.equal(cache.set("a", 1), cache);
  assert.equal(cache.set("a", 1).get("a"), 1);
});

test("peek reads the value without promoting recency", () => {
  const cache = createLRU({ max: 2 });
  cache.set("a", 1).set("b", 2);
  assert.equal(cache.peek("a"), 1);
  cache.set("c", 3); // a stayed LRU (peek didn't save it) -> evicted
  assert.equal(cache.has("a"), false);
  assert.equal(cache.has("b"), true);
  assert.equal(cache.has("c"), true);
});

test("has() disambiguates a stored undefined value from a missing key", () => {
  const cache = createLRU({ max: 2 });
  cache.set("u", undefined);
  assert.equal(cache.get("u"), undefined);
  assert.equal(cache.has("u"), true);
  assert.equal(cache.has("missing"), false);
});

test("delete returns true when a live key is removed, false otherwise", () => {
  const cache = createLRU({ max: 2 });
  cache.set("a", 1);
  assert.equal(cache.delete("a"), true);
  assert.equal(cache.delete("a"), false);
  assert.equal(cache.has("a"), false);
});

test("clear empties the cache", () => {
  const cache = createLRU({ max: 3 });
  cache.set("a", 1).set("b", 2);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.has("a"), false);
});

test("methods are safe to destructure (no `this` binding)", () => {
  const { set, get } = createLRU({ max: 2 });
  set("a", 1);
  assert.equal(get("a"), 1);
});

// ---- TTL (deterministic via an injected clock) ----

function manualClock(start = 1000) {
  let now = start;
  const clock = () => now;
  clock.advance = (ms) => { now += ms; };
  return clock;
}

test("TTL: an entry is treated as absent once expired", () => {
  const clock = manualClock();
  const cache = createLRU({ max: 4, ttl: 100, clock });
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
  clock.advance(101);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.has("a"), false);
  assert.equal(cache.peek("a"), undefined);
});

test("TTL: live just before the window closes, expired at exactly +ttl", () => {
  const clock = manualClock();
  const cache = createLRU({ max: 4, ttl: 100, clock });
  cache.set("a", 1);
  clock.advance(99);
  assert.equal(cache.has("a"), true);
  clock.advance(1); // now == insertion + ttl -> expired (inclusive)
  assert.equal(cache.has("a"), false);
});

test("TTL: set refreshes the expiry window", () => {
  const clock = manualClock();
  const cache = createLRU({ max: 4, ttl: 100, clock });
  cache.set("a", 1);
  clock.advance(80);
  cache.set("a", 2); // refresh: new expiry is now + 100
  clock.advance(80); // 160 since first set, only 80 since refresh -> still live
  assert.equal(cache.get("a"), 2);
  clock.advance(21); // 101 since refresh -> expired
  assert.equal(cache.has("a"), false);
});

test("TTL: size reflects live entries and purges expired", () => {
  const clock = manualClock();
  const cache = createLRU({ max: 4, ttl: 100, clock });
  cache.set("a", 1);
  clock.advance(50);
  cache.set("b", 2);
  clock.advance(60); // a: 110 old -> expired; b: 60 old -> live
  assert.equal(cache.size, 1);
  assert.equal(cache.has("b"), true);
});

test("no TTL: entries never expire", () => {
  const cache = createLRU({ max: 2 });
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.has("a"), true);
});

// ---- validation ----

test("validation: max must be a positive integer", () => {
  for (const bad of [0, -1, 1.5, "2", null, undefined, NaN]) {
    assert.throws(() => createLRU({ max: bad }), TypeError);
  }
});

test("validation: ttl, when provided, must be positive and finite", () => {
  for (const bad of [0, -5, NaN, Infinity, "100"]) {
    assert.throws(() => createLRU({ max: 2, ttl: bad }), TypeError);
  }
});

test("validation: clock must be a function", () => {
  assert.throws(() => createLRU({ max: 2, ttl: 100, clock: 123 }), TypeError);
});
