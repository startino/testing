// Co-located test suite for the duration format/parse module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every input/expectation lives ONCE in ../fixtures.mjs; this file only asserts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  ROUND_TRIP,
  FORMAT_CASES,
  LOSSY_FORMAT,
  BAD_FORMAT,
  BAD_PARSE,
} from "../fixtures.mjs";
import { formatDuration, parseDuration } from "../duration.mjs";

// 1. Round-trip law (on-grid): parse(format(ms)) === ms holds totally for the
//    curated grid set, including the mixed fractional-multi-unit cases. Each
//    case's `str` is also the exact string format emits, so we pin both legs.
for (const { name, ms, str } of ROUND_TRIP) {
  test(`round-trip: ${name}`, () => {
    assert.equal(formatDuration(ms), str);
    assert.equal(parseDuration(str), ms);
    assert.equal(parseDuration(formatDuration(ms)), ms);
  });
}

// 2. Format boundaries: format(ms) === str for the spec anchors and the unit-edge
//    / multi-unit boundary cases.
for (const { name, ms, str } of FORMAT_CASES) {
  test(`format boundary: ${name}`, () => {
    assert.equal(formatDuration(ms), str);
  });
}

// 3. Lossy format-direction (documented): one-decimal rounding loses sub-0.05s
//    resolution, so these are asserted in the FORMAT direction only — never as a
//    round-trip identity. (parseDuration("0s") is 0, not the original 1ms.)
for (const { name, ms, str } of LOSSY_FORMAT) {
  test(`lossy format: ${name}`, () => {
    assert.equal(formatDuration(ms), str);
  });
}

// 4. Fail-closed format: invalid ms returns null, never throws.
for (const { name, ms } of BAD_FORMAT) {
  test(`fail-closed format: ${name}`, () => {
    assert.equal(formatDuration(ms), null);
  });
}

// `-0` is a VALID input (normalized to 0), not a fail-closed case.
test("format normalizes -0 to 0s", () => {
  assert.equal(formatDuration(-0), "0s");
});

// 5. Fail-closed parse: any string outside the strict grammar — and any
//    non-string — returns null, never throws.
for (const { name, str } of BAD_PARSE) {
  test(`fail-closed parse: ${name}`, () => {
    assert.equal(parseDuration(str), null);
  });
}

// Purity: formatDuration must not mutate the opts object it is handed (the
// reserved param is read-only — a frozen opts proves nothing is written to it).
test("pure: formatDuration does not mutate its opts argument", () => {
  const opts = Object.freeze({});
  assert.doesNotThrow(() => formatDuration(1500, opts)); // a write would throw in strict mode
  const opts2 = { sentinel: 1 };
  formatDuration(90000, opts2);
  assert.deepEqual(opts2, { sentinel: 1 }); // untouched
});

// Purity: format and parse share no cross-call mutable state. Interleaving the
// two (and repeating each) must not perturb either result — this would fail if,
// say, the parse regex carried a `g`-flag `lastIndex` that advanced between
// calls, or either function memoized into shared scope.
test("pure: format and parse hold no shared state across interleaved calls", () => {
  for (const { ms, str } of ROUND_TRIP) {
    const f1 = formatDuration(ms);
    const p1 = parseDuration(str);
    parseDuration("1h 1m 1.5s"); // unrelated parse between the two reads
    formatDuration(3661000); // unrelated format between the two reads
    assert.equal(formatDuration(ms), f1);
    assert.equal(parseDuration(str), p1);
  }
});

// Format always returns a string for valid input and null for invalid — never
// any other type, never a throw.
test("format return type is string-or-null, never throws", () => {
  for (const ms of [0, 1, 1500, 90000, 86400000, -1, NaN, Infinity, 1.5, "x", null, {}]) {
    const out = formatDuration(ms);
    assert.ok(out === null || typeof out === "string");
  }
});

// Parse always returns a number for grammar input and null otherwise — never any
// other type, never a throw.
test("parse return type is number-or-null, never throws", () => {
  for (const str of ["0s", "1m 30s", "1h 1m 1.5s", "1m30s", "90s", "", null, 5, {}]) {
    const out = parseDuration(str);
    assert.ok(out === null || typeof out === "number");
  }
});
