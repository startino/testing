// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the Result test cases. Each case is defined ONCE
// here and imported by the test suite — the test file only asserts, never
// constructs the interesting inputs inline. Cases are grouped by the concern
// each proves. Some fixtures are THUNKS (`build()` / `run()`) rather than plain
// data because they need live references (a throwing function, a Result under
// test) or must observe a side effect (which handler fired).

import {
  ok,
  err,
  map as mapRaw,
  mapErr as mapErrRaw,
  andThen as andThenRaw,
} from "./result.mjs";

// A distinguished error object reused across cases so a test can assert the
// EXACT reference survives (unwrap throws it verbatim; err carries it as-is).
export const SENTINEL_ERROR = Object.freeze({ code: "E_BOOM", detail: "kaboom" });

// A shared plain value to prove Ok carries values by identity, not by copy.
export const SENTINEL_VALUE = Object.freeze({ id: 42 });

/**
 * Construction + guard cases. Each builds a Result and pins what it should be:
 * its `ok` tag, which guard is true, and the payload it carries (by ===).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   ok: boolean,
 *   payloadKey: "value" | "error",
 *   payload: unknown,
 * }>}
 */
export const CONSTRUCTION_CASES = Object.freeze([
  { name: "ok wraps a number", build: () => ok(1), ok: true, payloadKey: "value", payload: 1 },
  { name: "ok wraps null", build: () => ok(null), ok: true, payloadKey: "value", payload: null },
  {
    name: "ok wraps an object by identity",
    build: () => ok(SENTINEL_VALUE),
    ok: true,
    payloadKey: "value",
    payload: SENTINEL_VALUE,
  },
  { name: "err wraps a string", build: () => err("nope"), ok: false, payloadKey: "error", payload: "nope" },
  {
    name: "err wraps an error object by identity",
    build: () => err(SENTINEL_ERROR),
    ok: false,
    payloadKey: "error",
    payload: SENTINEL_ERROR,
  },
]);

/**
 * `map` cases: transform the Ok value, pass an Err through untouched. Each case
 * states the starting Result, the mapping fn, and what the mapped Result's
 * `ok`/payload should be. `passthrough` marks the case that must return the very
 * SAME Err reference (fn never called).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   fn: (v: any) => unknown,
 *   ok: boolean,
 *   payloadKey: "value" | "error",
 *   payload: unknown,
 *   passthrough: boolean,
 * }>}
 */
export const MAP_CASES = Object.freeze([
  {
    name: "map transforms Ok value",
    build: () => ok(2),
    fn: (x) => x + 1,
    ok: true,
    payloadKey: "value",
    payload: 3,
    passthrough: false,
  },
  {
    name: "map passes Err through untouched",
    build: () => err("bad"),
    fn: (x) => x + 1,
    ok: false,
    payloadKey: "error",
    payload: "bad",
    passthrough: true,
  },
]);

/**
 * `mapErr` cases: transform the Err value, pass an Ok through untouched. Mirror
 * of MAP_CASES on the error channel.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   fn: (e: any) => unknown,
 *   ok: boolean,
 *   payloadKey: "value" | "error",
 *   payload: unknown,
 *   passthrough: boolean,
 * }>}
 */
export const MAP_ERR_CASES = Object.freeze([
  {
    name: "mapErr transforms Err value",
    build: () => err("boom"),
    fn: (e) => e.length,
    ok: false,
    payloadKey: "error",
    payload: 4,
    passthrough: false,
  },
  {
    name: "mapErr passes Ok through untouched",
    build: () => ok(7),
    fn: (e) => e.length,
    ok: true,
    payloadKey: "value",
    payload: 7,
    passthrough: true,
  },
]);

/**
 * `andThen` chaining cases that DO return a Result from `fn`. Covers staying Ok
 * across a step, short-circuiting on an initial Err (fn never called), and an
 * fn that deliberately returns an Err to end the chain.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   fn: (v: any) => import("./result.mjs").Result<unknown, unknown>,
 *   ok: boolean,
 *   payloadKey: "value" | "error",
 *   payload: unknown,
 *   fnCalled: boolean,
 * }>}
 */
export const AND_THEN_CASES = Object.freeze([
  {
    name: "andThen chains an Ok into another Ok",
    build: () => ok(4),
    fn: (x) => ok(x * 2),
    ok: true,
    payloadKey: "value",
    payload: 8,
    fnCalled: true,
  },
  {
    name: "andThen short-circuits on Err (fn not called)",
    build: () => err("stop"),
    fn: (x) => ok(x * 2),
    ok: false,
    payloadKey: "error",
    payload: "stop",
    fnCalled: false,
  },
  {
    name: "andThen lets fn convert an Ok into an Err",
    build: () => ok(-1),
    fn: (x) => (x < 0 ? err("negative") : ok(x)),
    ok: false,
    payloadKey: "error",
    payload: "negative",
    fnCalled: true,
  },
]);

/**
 * `andThen` cases where `fn` returns a NON-Result — a programming error the
 * function must reject with a TypeError. Each thunk performs the offending call
 * and is expected to throw.
 *
 * @type {ReadonlyArray<{ name: string, run: () => unknown }>}
 */
export const AND_THEN_TYPE_ERROR_CASES = Object.freeze([
  { name: "fn returns a bare number", run: () => andThenRaw(ok(1), () => 5) },
  { name: "fn returns a plain object without ok tag", run: () => andThenRaw(ok(1), () => ({ value: 5 })) },
  { name: "fn returns undefined", run: () => andThenRaw(ok(1), () => undefined) },
  { name: "fn returns null", run: () => andThenRaw(ok(1), () => null) },
  { name: "fn returns an array", run: () => andThenRaw(ok(1), () => [ok(1)]) },
]);

/**
 * `unwrapOr` cases: Ok returns its value, Err returns the fallback.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   fallback: unknown,
 *   expected: unknown,
 * }>}
 */
export const UNWRAP_OR_CASES = Object.freeze([
  { name: "unwrapOr returns Ok value, ignores fallback", build: () => ok(10), fallback: 99, expected: 10 },
  { name: "unwrapOr returns fallback for Err", build: () => err("x"), fallback: 99, expected: 99 },
  { name: "unwrapOr Ok(false) returns false not fallback", build: () => ok(false), fallback: true, expected: false },
]);

/**
 * `unwrap` cases. `ok` cases return the value; `throws` cases must throw the
 * EXACT contained error (asserted by === against `thrown`).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   throws: boolean,
 *   expected?: unknown,
 *   thrown?: unknown,
 * }>}
 */
export const UNWRAP_CASES = Object.freeze([
  { name: "unwrap returns Ok value", build: () => ok(SENTINEL_VALUE), throws: false, expected: SENTINEL_VALUE },
  {
    name: "unwrap throws the contained error verbatim",
    build: () => err(SENTINEL_ERROR),
    throws: true,
    thrown: SENTINEL_ERROR,
  },
  {
    name: "unwrap throws a string error as-is",
    build: () => err("plain-string-error"),
    throws: true,
    thrown: "plain-string-error",
  },
]);

/**
 * `match` cases: which handler fires, and what it returns. `branch` records the
 * handler that should run so the test can assert dispatch (not just the return).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   build: () => import("./result.mjs").Result<unknown, unknown>,
 *   branch: "ok" | "err",
 *   expected: string,
 * }>}
 */
export const MATCH_CASES = Object.freeze([
  { name: "match dispatches to ok handler", build: () => ok(3), branch: "ok", expected: "ok:3" },
  { name: "match dispatches to err handler", build: () => err("e"), branch: "err", expected: "err:e" },
]);

/**
 * `fromThrowable` cases. Each provides a fn plus args; a non-throwing fn must
 * yield an Ok of its return, a throwing fn an Err carrying the thrown value
 * (asserted by === against `thrown` when given).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   fn: (...args: any[]) => unknown,
 *   args: unknown[],
 *   ok: boolean,
 *   expected?: unknown,
 *   thrown?: unknown,
 * }>}
 */
export const FROM_THROWABLE_CASES = Object.freeze([
  {
    name: "fromThrowable wraps a successful return in Ok",
    fn: (a, b) => a + b,
    args: [2, 3],
    ok: true,
    expected: 5,
  },
  {
    name: "fromThrowable catches a thrown Error into Err",
    fn: () => {
      throw SENTINEL_ERROR;
    },
    args: [],
    ok: false,
    thrown: SENTINEL_ERROR,
  },
  {
    name: "fromThrowable catches a thrown string into Err",
    fn: () => {
      throw "string-thrown";
    },
    args: [],
    ok: false,
    thrown: "string-thrown",
  },
  {
    name: "fromThrowable forwards all args to fn",
    fn: (...xs) => xs.join("-"),
    args: ["a", "b", "c"],
    ok: true,
    expected: "a-b-c",
  },
]);

/**
 * Immutability cases: every constructor / combinator must return a FROZEN
 * Result. Each thunk returns a Result that should satisfy Object.isFrozen.
 *
 * @type {ReadonlyArray<{ name: string, build: () => import("./result.mjs").Result<unknown, unknown> }>}
 */
export const FROZEN_CASES = Object.freeze([
  { name: "ok(...) is frozen", build: () => ok(1) },
  { name: "err(...) is frozen", build: () => err("e") },
  { name: "map(...) result is frozen", build: () => mapRaw(ok(1), (x) => x + 1) },
  { name: "mapErr(...) result is frozen", build: () => mapErrRaw(err("e"), (e) => e + "!") },
  { name: "andThen(...) result is frozen", build: () => andThenRaw(ok(1), (x) => ok(x + 1)) },
]);
