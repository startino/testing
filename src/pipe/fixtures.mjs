// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the pipe/flow/compose/tap/identity test cases.
// Each case is defined ONCE here and imported by the test suite — the test file
// only asserts, never constructs the interesting inputs inline. Cases are
// grouped by the concern each proves. A few fixtures are shared small unary
// functions so a case can assert that `flow` and `compose` are mirror images on
// the EXACT SAME fn list.

// ---------------------------------------------------------------------------
// Shared unary building blocks. Kept trivial and pure so the composition, not
// the arithmetic, is what the tests are exercising.
// ---------------------------------------------------------------------------
export const inc = (x) => x + 1;
export const double = (x) => x * 2;
export const negate = (x) => -x;
export const toStr = (x) => String(x);
export const exclaim = (s) => s + "!";

/**
 * `pipe` threading cases: a starting value plus a list of unary fns applied
 * left-to-right, and the expected final result. The no-fn case proves
 * `pipe(v)` returns `v` unchanged (by === so identity is proven, not shape).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   value: unknown,
 *   fns: ReadonlyArray<(arg: any) => any>,
 *   expected: unknown,
 * }>}
 */
export const PIPE_CASES = Object.freeze([
  {
    name: "threads a value through several fns left-to-right",
    value: 3,
    fns: [inc, double, negate], // negate(double(inc(3))) = negate(double(4)) = negate(8) = -8
    expected: -8,
  },
  {
    name: "threads through two fns in order (inc then double)",
    value: 5,
    fns: [inc, double], // double(inc(5)) = double(6) = 12
    expected: 12,
  },
  {
    name: "order matters: double then inc differs from inc then double",
    value: 5,
    fns: [double, inc], // inc(double(5)) = inc(10) = 11
    expected: 11,
  },
  {
    name: "changes type across the pipeline (number -> string)",
    value: 41,
    fns: [inc, toStr, exclaim], // exclaim(toStr(inc(41))) = exclaim("42") = "42!"
    expected: "42!",
  },
]);

// A shared object used to prove `pipe(v)` returns the SAME reference by identity.
export const SENTINEL_VALUE = Object.freeze({ id: 7 });

/**
 * `pipe(v)` with no fns returns `v` unchanged — asserted by === against the
 * SAME reference in the test.
 *
 * @type {ReadonlyArray<{ name: string, value: unknown }>}
 */
export const PIPE_NO_FN_CASES = Object.freeze([
  { name: "pipe(v) with no fns returns v (primitive)", value: 99 },
  { name: "pipe(v) with no fns returns the same object reference", value: SENTINEL_VALUE },
]);

/**
 * `flow` cases: a list of fns composed left-to-right into a reusable fn, the
 * input to feed it, and the expected output. Mirrors PIPE_CASES because
 * `flow(...fns)(v)` must equal `pipe(v, ...fns)`.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   fns: ReadonlyArray<(arg: any) => any>,
 *   input: unknown,
 *   expected: unknown,
 * }>}
 */
export const FLOW_CASES = Object.freeze([
  {
    name: "composes left-to-right (inc, double, negate)",
    fns: [inc, double, negate],
    input: 3,
    expected: -8,
  },
  {
    name: "composes across a type change (inc, toStr, exclaim)",
    fns: [inc, toStr, exclaim],
    input: 41,
    expected: "42!",
  },
]);

/**
 * `compose` cases: a list of fns composed RIGHT-to-left into a reusable fn.
 * Note the expectation reflects reverse order: `compose(f, g)(x) === f(g(x))`.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   fns: ReadonlyArray<(arg: any) => any>,
 *   input: unknown,
 *   expected: unknown,
 * }>}
 */
export const COMPOSE_CASES = Object.freeze([
  {
    name: "composes right-to-left (inc, double, negate)",
    fns: [inc, double, negate], // inc(double(negate(3))) = inc(double(-3)) = inc(-6) = -5
    input: 3,
    expected: -5,
  },
  {
    name: "compose(f, g)(x) equals f(g(x))",
    fns: [exclaim, toStr], // exclaim(toStr(42)) = exclaim("42") = "42!"
    input: 42,
    expected: "42!",
  },
]);

/**
 * Mirror-image cases: for the SAME fn list, `flow` and `compose` apply the fns
 * in reverse order relative to each other. The test builds both from `fns` and
 * asserts each against its own expected output on the same input.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   fns: ReadonlyArray<(arg: any) => any>,
 *   input: unknown,
 *   flowExpected: unknown,
 *   composeExpected: unknown,
 * }>}
 */
export const MIRROR_CASES = Object.freeze([
  {
    name: "flow vs compose on [inc, double] are mirror images",
    fns: [inc, double],
    input: 5,
    flowExpected: 12, // double(inc(5)) = 12
    composeExpected: 11, // inc(double(5)) = 11
  },
  {
    name: "flow vs compose on [double, negate] are mirror images",
    fns: [double, negate],
    input: 4,
    flowExpected: -8, // negate(double(4)) = -8
    composeExpected: -8, // double(negate(4)) = double(-4) = -8 (symmetric here by design)
  },
]);

/**
 * Identity-edge cases: `flow()` and `compose()` (no fns) must be the identity
 * function, returning their argument unchanged (asserted by === so object
 * identity is proven).
 *
 * @type {ReadonlyArray<{ name: string, input: unknown }>}
 */
export const EMPTY_COMPOSE_CASES = Object.freeze([
  { name: "empty varargs on a primitive", input: 123 },
  { name: "empty varargs on an object (same reference)", input: SENTINEL_VALUE },
]);

/**
 * `identity` cases: returns its argument unchanged, by === for objects.
 *
 * @type {ReadonlyArray<{ name: string, input: unknown }>}
 */
export const IDENTITY_CASES = Object.freeze([
  { name: "identity on a number", input: 0 },
  { name: "identity on a string", input: "hi" },
  { name: "identity on an object (same reference)", input: SENTINEL_VALUE },
  { name: "identity on null", input: null },
]);

/**
 * `tap` cases: the wrapped fn returns the ORIGINAL value unchanged (by ===),
 * while the side effect actually runs. `sideEffect` is a thunk factory: the
 * test calls `makeSpy()` to get a fresh { fn, seen } pair so it can assert both
 * the return value AND that `fn` observed the value.
 *
 * @type {ReadonlyArray<{ name: string, value: unknown }>}
 */
export const TAP_CASES = Object.freeze([
  { name: "tap returns the original primitive and runs the effect", value: 42 },
  { name: "tap returns the original object reference and runs the effect", value: SENTINEL_VALUE },
]);

/**
 * Reusability: a fn produced by `flow` / `compose` must be callable MORE THAN
 * ONCE with consistent, independent results (it closes over the fns, holds no
 * per-call state). Each case gives the composed fn's fns, the builder to use,
 * and two inputs with their two expected outputs.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   builder: "flow" | "compose",
 *   fns: ReadonlyArray<(arg: any) => any>,
 *   inputs: [unknown, unknown],
 *   expected: [unknown, unknown],
 * }>}
 */
export const REUSE_CASES = Object.freeze([
  {
    name: "a flow-built fn is reusable across calls",
    builder: "flow",
    fns: [inc, double],
    inputs: [5, 10],
    expected: [12, 22], // double(inc(5))=12 ; double(inc(10))=22
  },
  {
    name: "a compose-built fn is reusable across calls",
    builder: "compose",
    fns: [inc, double],
    inputs: [5, 10],
    expected: [11, 21], // inc(double(5))=11 ; inc(double(10))=21
  },
]);
