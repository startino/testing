// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the composition-helper test cases. Each case is
// defined ONCE here and imported by the test suite — no copy-paste of inputs or
// expectations in the test file. Because these helpers operate on FUNCTIONS (not
// just data), the reusable stage functions live here too, so a case is a fully
// self-contained fixture the test file only has to assert against.

/**
 * Small pure stage functions reused across the fixtures. Kept unary so they
 * slot into any pipeline. Defined once here; referenced by the CASES below.
 */
export const inc = (n) => n + 1;
export const dbl = (n) => n * 2;
export const neg = (n) => -n;
export const toStr = (n) => String(n);
export const exclaim = (s) => s + "!";

/**
 * Table-driven cases for the value-first {@link pipe}. Each pairs an input value
 * and an ordered list of stage functions with the exact expected result, chosen
 * so the ORDER is observable (non-commutative stages).
 *
 * @type {ReadonlyArray<{ name: string, value: any, fns: ReadonlyArray<function(any): any>, expected: any }>}
 */
export const PIPE_CASES = Object.freeze([
  // (3 + 1) * 2 = 8 — proves inc runs before dbl (left-to-right).
  { name: "threads left-to-right (inc then dbl)", value: 3, fns: [inc, dbl], expected: 8 },
  // Reversed stage order gives a different result: (3 * 2) + 1 = 7.
  { name: "order matters (dbl then inc)", value: 3, fns: [dbl, inc], expected: 7 },
  // Cross-type chain: 4 -> 5 -> "5" -> "5!".
  { name: "mixed-type chain", value: 4, fns: [inc, toStr, exclaim], expected: "5!" },
  // Empty varargs: value passes through unchanged.
  { name: "empty varargs passes value through", value: 42, fns: [], expected: 42 },
  // Single function behaves like a plain application.
  { name: "single function", value: 10, fns: [neg], expected: -10 },
]);

/**
 * Table-driven cases for the point-free composers. `order` records which
 * direction the composer applies `fns`, and `expected` is the result of calling
 * the built function on `input`. Shared by the {@link compose} (right-to-left)
 * and {@link flow} (left-to-right) suites, which pick the matching `order`.
 *
 * @type {ReadonlyArray<{ name: string, order: "ltr" | "rtl", fns: ReadonlyArray<function(any): any>, input: any, expected: any }>}
 */
export const COMPOSE_CASES = Object.freeze([
  // compose(inc, dbl)(3) = inc(dbl(3)) = inc(6) = 7 — dbl runs first.
  { name: "compose applies right-to-left", order: "rtl", fns: [inc, dbl], input: 3, expected: 7 },
  // flow(inc, dbl)(3) = dbl(inc(3)) = dbl(4) = 8 — inc runs first.
  { name: "flow applies left-to-right", order: "ltr", fns: [inc, dbl], input: 3, expected: 8 },
  // Same two fns, opposite composer => opposite result (7 vs 8) pins the order.
  { name: "compose vs flow disagree on order", order: "rtl", fns: [dbl, inc], input: 3, expected: 8 },
  { name: "flow of the same pair", order: "ltr", fns: [dbl, inc], input: 3, expected: 7 },
]);
