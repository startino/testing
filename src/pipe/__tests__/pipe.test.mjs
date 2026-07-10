// Co-located test suite for the function-composition helpers.
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

import { PIPE_CASES, COMPOSE_CASES, inc, dbl } from "../fixtures.mjs";
import { pipe, compose, flow, tap, identity } from "../pipe.mjs";

// pipe: table-driven threading order + empty-varargs pass-through.
for (const { name, value, fns, expected } of PIPE_CASES) {
  test(`pipe case: ${name}`, () => {
    assert.equal(pipe(value, ...fns), expected);
  });
}

// compose / flow: table-driven, each case routed to the composer matching its
// declared `order` (rtl -> compose, ltr -> flow).
for (const { name, order, fns, input, expected } of COMPOSE_CASES) {
  test(`compose/flow case: ${name}`, () => {
    const built = order === "rtl" ? compose(...fns) : flow(...fns);
    assert.equal(built(input), expected);
  });
}

// Explicit order proof: same fn pair, opposite composers, opposite results.
test("compose is right-to-left, flow is left-to-right", () => {
  assert.equal(compose(inc, dbl)(3), 7); // inc(dbl(3)) = inc(6)
  assert.equal(flow(inc, dbl)(3), 8); // dbl(inc(3)) = dbl(4)
});

// Empty-varargs: an empty pipeline is the identity.
test("empty varargs behave as identity", () => {
  assert.equal(pipe(99), 99); // no fns -> value unchanged
  assert.equal(compose()(99), 99); // identity function
  assert.equal(flow()(99), 99); // identity function
});

// tap: the side effect MUST fire, AND the return value MUST be the original x
// (tap never substitutes fn's return for the threaded value).
test("tap fires the side effect and returns the original value", () => {
  const seen = [];
  const spy = (x) => {
    seen.push(x);
    return "IGNORED RETURN"; // must be discarded by tap
  };
  const tapped = tap(spy);

  const out = tapped(7);

  assert.equal(out, 7); // original value passed through, not "IGNORED RETURN"
  assert.deepEqual(seen, [7]); // side effect actually fired, exactly once, with x
});

// tap inside a pipe: observes an intermediate value without altering the chain.
test("tap in a pipe leaves the threaded value untouched", () => {
  const seen = [];
  const result = pipe(
    3,
    inc, // 4
    tap((x) => seen.push(x)), // observes 4, passes 4 through
    dbl, // 8
  );
  assert.equal(result, 8);
  assert.deepEqual(seen, [4]);
});

// identity: returns its argument unchanged, including reference identity.
test("identity returns its argument unchanged", () => {
  assert.equal(identity(5), 5);
  const obj = { a: 1 };
  assert.equal(identity(obj), obj); // same reference, not a copy
  assert.equal(identity(undefined), undefined);
});
