// Co-located test suite for the deepEqual module.
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

import { CASES, CYCLIC_CASES, FUNCTION_CASES } from "../fixtures.mjs";
import { deepEqual } from "../deep-equal.mjs";

// 1. Flat comparison table. Each case pins deepEqual(a, b) to its expected
//    boolean. Equality is symmetric under the contract, so we assert BOTH
//    directions for every case — a fixture only states the pair once, and an
//    accidentally-asymmetric implementation is caught here.
for (const { name, a, b, equal } of CASES) {
  test(`case: ${name}`, () => {
    assert.equal(deepEqual(a, b), equal);
    assert.equal(deepEqual(b, a), equal);
  });
}

// 2. Reflexivity: every non-NaN-bearing case's `a` deep-equals itself. (NaN is
//    handled explicitly in the table above; self-comparison of a value holding
//    NaN still returns true via SameValueZero, so this holds universally.)
for (const { name, a } of CASES) {
  test(`reflexive: ${name}`, () => {
    assert.equal(deepEqual(a, a), true);
  });
}

// 3. Cyclic structures. Built fresh per case (a literal cannot self-reference),
//    asserted in both directions. Proves the `seen` cycle guard both terminates
//    and still distinguishes structurally-different cycles.
for (const { name, build, equal } of CYCLIC_CASES) {
  test(`cyclic: ${name}`, () => {
    const { a, b } = build();
    assert.equal(deepEqual(a, b), equal);
    assert.equal(deepEqual(b, a), equal);
  });
}

// 4. Function identity. Same reference equal; distinct references (even with
//    identical source) unequal, including when nested inside objects.
for (const { name, build, equal } of FUNCTION_CASES) {
  test(`function: ${name}`, () => {
    const { a, b } = build();
    assert.equal(deepEqual(a, b), equal);
    assert.equal(deepEqual(b, a), equal);
  });
}
