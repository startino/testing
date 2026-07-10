// Co-located test suite for the Result module.
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
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrapOr,
  unwrap,
  match,
  fromThrowable,
} from "../result.mjs";
import {
  CONSTRUCTION_CASES,
  MAP_CASES,
  MAP_ERR_CASES,
  AND_THEN_CASES,
  AND_THEN_TYPE_ERROR_CASES,
  UNWRAP_OR_CASES,
  UNWRAP_CASES,
  MATCH_CASES,
  FROM_THROWABLE_CASES,
  FROZEN_CASES,
} from "../fixtures.mjs";

// 1. Construction + guards. Each case pins the tag, both guards, and the carried
//    payload (by ===, so identity of wrapped objects is proven, not just shape).
for (const { name, build, ok: expectOk, payloadKey, payload } of CONSTRUCTION_CASES) {
  test(`construct: ${name}`, () => {
    const r = build();
    assert.equal(r.ok, expectOk);
    assert.equal(isOk(r), expectOk);
    assert.equal(isErr(r), !expectOk);
    assert.equal(r[payloadKey], payload);
  });
}

// 2. map — transforms the Ok value, passes an Err through UNTOUCHED (the same
//    reference, proving fn was never called on the error channel).
for (const { name, build, fn, ok: expectOk, payloadKey, payload, passthrough } of MAP_CASES) {
  test(`map: ${name}`, () => {
    const input = build();
    const out = map(input, fn);
    assert.equal(out.ok, expectOk);
    assert.equal(out[payloadKey], payload);
    if (passthrough) assert.equal(out, input); // same Err reference flows through
  });
}

// 3. mapErr — mirror of map on the error channel.
for (const { name, build, fn, ok: expectOk, payloadKey, payload, passthrough } of MAP_ERR_CASES) {
  test(`mapErr: ${name}`, () => {
    const input = build();
    const out = mapErr(input, fn);
    assert.equal(out.ok, expectOk);
    assert.equal(out[payloadKey], payload);
    if (passthrough) assert.equal(out, input); // same Ok reference flows through
  });
}

// 4. andThen — chaining that stays Ok, short-circuits on Err (fn NOT called),
//    and can convert an Ok into an Err. A spy wrapper proves whether fn ran.
for (const { name, build, fn, ok: expectOk, payloadKey, payload, fnCalled } of AND_THEN_CASES) {
  test(`andThen: ${name}`, () => {
    let called = false;
    const spy = (v) => {
      called = true;
      return fn(v);
    };
    const out = andThen(build(), spy);
    assert.equal(out.ok, expectOk);
    assert.equal(out[payloadKey], payload);
    assert.equal(called, fnCalled);
  });
}

// 5. andThen contract violation — fn returning a non-Result is a programming
//    error and MUST throw a TypeError (never silently wrap a malformed value).
for (const { name, run } of AND_THEN_TYPE_ERROR_CASES) {
  test(`andThen TypeError: ${name}`, () => {
    assert.throws(run, TypeError);
  });
}

// 6. unwrapOr — Ok value on success, fallback on Err (and Ok(false) must return
//    false, not the fallback — the value is what matters, not truthiness).
for (const { name, build, fallback, expected } of UNWRAP_OR_CASES) {
  test(`unwrapOr: ${name}`, () => {
    assert.equal(unwrapOr(build(), fallback), expected);
  });
}

// 7. unwrap — returns the value on Ok; throws the EXACT contained error on Err.
for (const { name, build, throws, expected, thrown } of UNWRAP_CASES) {
  test(`unwrap: ${name}`, () => {
    if (throws) {
      // The thrown value is the contained error, verbatim (asserted by ===).
      assert.throws(
        () => unwrap(build()),
        (e) => e === thrown,
      );
    } else {
      assert.equal(unwrap(build()), expected);
    }
  });
}

// 8. match — dispatches to exactly the right handler and returns its result.
//    The `branch` field records which handler must fire, asserted via a marker.
for (const { name, build, branch, expected } of MATCH_CASES) {
  test(`match: ${name}`, () => {
    let fired = null;
    const out = match(build(), {
      ok: (v) => {
        fired = "ok";
        return `ok:${v}`;
      },
      err: (e) => {
        fired = "err";
        return `err:${e}`;
      },
    });
    assert.equal(fired, branch);
    assert.equal(out, expected);
  });
}

// 9. fromThrowable — wraps a returning fn into Ok, a throwing fn into Err with
//    the thrown value verbatim, and forwards all args unchanged.
for (const { name, fn, args, ok: expectOk, expected, thrown } of FROM_THROWABLE_CASES) {
  test(`fromThrowable: ${name}`, () => {
    const wrapped = fromThrowable(fn);
    const out = wrapped(...args);
    assert.equal(out.ok, expectOk);
    if (expectOk) {
      assert.equal(out.value, expected);
    } else {
      assert.equal(out.error, thrown); // thrown value carried verbatim
    }
  });
}

// 10. Immutability — every constructor and combinator returns a FROZEN Result,
//     so a caller can never mutate `.ok` / `.value` / `.error` after the fact.
for (const { name, build } of FROZEN_CASES) {
  test(`frozen: ${name}`, () => {
    assert.equal(Object.isFrozen(build()), true);
  });
}
