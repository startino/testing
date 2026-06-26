// Co-located test suite for the bytes (IEC) format/parse module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every input/expectation lives ONCE in ./fixtures.mjs; this file only asserts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  ROUND_TRIP,
  FORMAT_CASES,
  DECIMALS_CASES,
  LOSSY_FORMAT,
  BAD_FORMAT,
  BAD_DECIMALS,
  BAD_PARSE,
} from "./fixtures.mjs";
import { formatBytes, parseBytes } from "./index.mjs";

// 1. Round-trip law (on-grid): parse(format(n)) === n holds totally for the
//    curated grid set (0, exact unit multiples at every scale, clean fractions).
//    Each case's `str` is also the exact string format emits, so we pin both legs.
for (const { name, n, str } of ROUND_TRIP) {
  test(`round-trip: ${name}`, () => {
    assert.equal(formatBytes(n), str);
    assert.equal(parseBytes(str), n);
    assert.equal(parseBytes(formatBytes(n)), n);
  });
}

// 2. Format boundaries: format(n) === str for the spec anchors and the unit-edge
//    / sub-unit / in-and-above-PiB boundary cases.
for (const { name, n, str } of FORMAT_CASES) {
  test(`format boundary: ${name}`, () => {
    assert.equal(formatBytes(n), str);
  });
}

// 3. The `decimals` option: overrides, trailing-zero trimming (decimals is a MAX
//    precision, not a fixed width), and bytes-are-always-integer.
for (const { name, n, decimals, str } of DECIMALS_CASES) {
  test(`decimals option: ${name}`, () => {
    assert.equal(formatBytes(n, { decimals }), str);
  });
}

// 4. Lossy format-direction (documented): one-decimal rounding can carry a
//    magnitude up to the next whole unit-count, so these are asserted in the
//    FORMAT direction only — never as a round-trip identity. (parseBytes("1024 KiB")
//    is 1048576, not the original 1048575.)
for (const { name, n, str } of LOSSY_FORMAT) {
  test(`lossy format: ${name}`, () => {
    assert.equal(formatBytes(n), str);
  });
}

// 5. Fail-closed format: invalid byte count returns null, never throws.
for (const { name, n } of BAD_FORMAT) {
  test(`fail-closed format: ${name}`, () => {
    assert.equal(formatBytes(n), null);
  });
}

// 6. Fail-closed decimals: an invalid `opts.decimals` returns null, never throws.
//    The byte count itself (1536) is valid, so only the bad decimals fails it.
for (const { name, decimals } of BAD_DECIMALS) {
  test(`fail-closed decimals: ${name}`, () => {
    assert.equal(formatBytes(1536, { decimals }), null);
  });
}

// `-0` is a VALID input (normalized to 0), not a fail-closed case.
test("format normalizes -0 to 0 B", () => {
  assert.equal(formatBytes(-0), "0 B");
});

// 7. Fail-closed parse: any string outside the strict grammar — and any
//    non-string — returns null, never throws.
for (const { name, str } of BAD_PARSE) {
  test(`fail-closed parse: ${name}`, () => {
    assert.equal(parseBytes(str), null);
  });
}

// Purity: formatBytes must not mutate the opts object it is handed (a frozen opts
// proves nothing is written to it — a write would throw in strict mode).
test("pure: formatBytes does not mutate its opts argument", () => {
  const opts = Object.freeze({ decimals: 2 });
  assert.doesNotThrow(() => formatBytes(1536, opts));
  const opts2 = { decimals: 1, sentinel: 1 };
  formatBytes(1048576, opts2);
  assert.deepEqual(opts2, { decimals: 1, sentinel: 1 }); // untouched
});

// Purity: format and parse share no cross-call mutable state. Interleaving the
// two (and repeating each) must not perturb either result — this would fail if,
// say, the parse regex carried a `g`-flag `lastIndex` that advanced between
// calls, or either function memoized into shared scope.
test("pure: format and parse hold no shared state across interleaved calls", () => {
  for (const { n, str } of ROUND_TRIP) {
    const f1 = formatBytes(n);
    const p1 = parseBytes(str);
    parseBytes("1.5 KiB"); // unrelated parse between the two reads
    formatBytes(1048576); // unrelated format between the two reads
    assert.equal(formatBytes(n), f1);
    assert.equal(parseBytes(str), p1);
  }
});

// Format always returns a string for valid input and null for invalid — never
// any other type, never a throw. Includes hostile inputs.
test("format return type is string-or-null, never throws", () => {
  const hostile = [0, 1, 512, 1536, 1048576, -1, NaN, Infinity, 1.5, "x", null, undefined, {}, [], true, 1024n];
  for (const n of hostile) {
    const out = formatBytes(n);
    assert.ok(out === null || typeof out === "string");
  }
  // Hostile decimals on a valid byte count must also stay string-or-null.
  for (const decimals of [-1, 1.5, NaN, Infinity, "2", null, {}, true]) {
    const out = formatBytes(1536, { decimals });
    assert.ok(out === null || typeof out === "string");
  }
});

// Parse always returns a number for grammar input and null otherwise — never any
// other type, never a throw. Includes hostile inputs.
test("parse return type is number-or-null, never throws", () => {
  const hostile = ["0 B", "1 KiB", "1.5 KiB", "1 MiB", "1 KB", "1024", "1.5 B", "", "   ", null, undefined, 1024, {}, []];
  for (const str of hostile) {
    const out = parseBytes(str);
    assert.ok(out === null || typeof out === "number");
  }
});
