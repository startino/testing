// Co-located test suite for the slugify module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from the repo root):  npm test --prefix src/slug
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every input/expectation lives ONCE in ../fixtures.mjs; this file only asserts.

import test from "node:test";
import assert from "node:assert/strict";

import { CASES } from "../fixtures.mjs";
import { slugify } from "../slug.mjs";

// 1-9. Table-driven behavioral cases (basic, diacritic fold, collapse,
//      fail-closed x3, custom separator, maxLength token-boundary truncation).
for (const { name, input, opts, expected } of CASES) {
  test(`case: ${name}`, () => {
    assert.equal(slugify(input, opts), expected);
  });
}

// Idempotence: a slug fed back through slugify is unchanged.
test("idempotent on its own output", () => {
  for (const { input, opts } of CASES) {
    const once = slugify(input, opts);
    assert.equal(slugify(once, opts), once);
  }
});

// Never throws on hostile/non-string input; always returns a string.
test("fail-closed: non-string input returns a string, never throws", () => {
  for (const bad of [null, undefined, 12345, {}, [], true]) {
    const out = slugify(bad);
    assert.equal(typeof out, "string");
  }
});

// maxLength: when not even the first token fits, the first token is hard-cut
// with no trailing separator.
test("maxLength shorter than first token hard-cuts the token", () => {
  assert.equal(slugify("javascript", { maxLength: 4 }), "java");
  assert.equal(slugify("the quick brown", { maxLength: 2 }), "th");
});

// No leading/trailing/repeated separators ever appear.
test("no stray separators", () => {
  assert.equal(slugify("---Hello---World---"), "hello-world");
  assert.equal(slugify("a...b...c"), "a-b-c");
});
