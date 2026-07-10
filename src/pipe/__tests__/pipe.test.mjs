// Co-located test suite for the pipe module.
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

import { pipe, flow, compose, tap, identity } from "../pipe.mjs";
import {
  PIPE_CASES,
  PIPE_NO_FN_CASES,
  FLOW_CASES,
  COMPOSE_CASES,
  MIRROR_CASES,
  EMPTY_COMPOSE_CASES,
  IDENTITY_CASES,
  TAP_CASES,
  REUSE_CASES,
} from "../fixtures.mjs";

// 1. pipe — threads a value left-to-right through a list of unary fns, feeding
//    each result into the next. Covers ordering (fn order changes the result)
//    and type changes across the pipeline.
for (const { name, value, fns, expected } of PIPE_CASES) {
  test(`pipe: ${name}`, () => {
    assert.deepEqual(pipe(value, ...fns), expected);
  });
}

// 2. pipe(v) with no fns returns v UNCHANGED — the same reference (===), so the
//    empty-varargs edge is proven total, not merely shape-equal.
for (const { name, value } of PIPE_NO_FN_CASES) {
  test(`pipe no-fn: ${name}`, () => {
    assert.equal(pipe(value), value);
  });
}

// 3. flow — builds a reusable fn applying its fns left-to-right;
//    flow(...fns)(v) must equal pipe(v, ...fns).
for (const { name, fns, input, expected } of FLOW_CASES) {
  test(`flow: ${name}`, () => {
    const f = flow(...fns);
    assert.deepEqual(f(input), expected);
    // Cross-check the flow/pipe equivalence on the same list + input.
    assert.deepEqual(f(input), pipe(input, ...fns));
  });
}

// 4. compose — builds a reusable fn applying its fns RIGHT-to-left, i.e.
//    compose(f, g)(x) === f(g(x)).
for (const { name, fns, input, expected } of COMPOSE_CASES) {
  test(`compose: ${name}`, () => {
    const f = compose(...fns);
    assert.deepEqual(f(input), expected);
  });
}

// 5. flow and compose are MIRROR IMAGES on the same fn list — for identical fns
//    they apply them in reverse order relative to each other.
for (const { name, fns, input, flowExpected, composeExpected } of MIRROR_CASES) {
  test(`mirror: ${name}`, () => {
    assert.deepEqual(flow(...fns)(input), flowExpected);
    assert.deepEqual(compose(...fns)(input), composeExpected);
    // compose(...fns) is flow over the reversed fn list.
    assert.deepEqual(compose(...fns)(input), flow(...[...fns].reverse())(input));
  });
}

// 6. flow() and compose() with NO fns are the identity function — argument
//    returned unchanged (same reference for objects).
for (const { name, input } of EMPTY_COMPOSE_CASES) {
  test(`flow() identity: ${name}`, () => {
    assert.equal(flow()(input), input);
  });
  test(`compose() identity: ${name}`, () => {
    assert.equal(compose()(input), input);
  });
}

// 7. identity — returns its argument unchanged, by === so object identity holds.
for (const { name, input } of IDENTITY_CASES) {
  test(`identity: ${name}`, () => {
    assert.equal(identity(input), input);
  });
}

// 8. tap — the wrapped fn returns the ORIGINAL value (===) AND actually runs its
//    side effect. A captured variable proves the effect fired and saw the value.
for (const { name, value } of TAP_CASES) {
  test(`tap: ${name}`, () => {
    let seen;
    let calls = 0;
    const tapped = tap((x) => {
      seen = x;
      calls += 1;
    });
    const out = tapped(value);
    assert.equal(out, value); // original value flows through unchanged (by ===)
    assert.equal(seen, value); // the side effect actually observed the value
    assert.equal(calls, 1); // and ran exactly once
  });
}

// 9. Reusability — a fn produced by flow/compose can be called MORE THAN ONCE
//    with consistent, independent results (it holds no per-call state).
for (const { name, builder, fns, inputs, expected } of REUSE_CASES) {
  test(`reuse: ${name}`, () => {
    const f = builder === "flow" ? flow(...fns) : compose(...fns);
    assert.deepEqual(f(inputs[0]), expected[0]);
    assert.deepEqual(f(inputs[1]), expected[1]);
    // Calling again with the first input still yields the first result —
    // proving the produced fn is stateless and reusable.
    assert.deepEqual(f(inputs[0]), expected[0]);
  });
}
