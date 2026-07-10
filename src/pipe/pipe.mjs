// Function-composition helpers — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/slug/ and src/duration/. Rationale: threading
// a value through a chain of unary functions and building composed functions from
// varargs needs nothing beyond the language itself — `Array.prototype.reduce`,
// rest/spread parameters, and arrow functions are all Node 24 stdlib. Zero
// install, zero build step; there is no third-party dependency a composition
// helper could justify without breaking the zero-dep contract.
//
// Design:
//   - Every helper is a total, pure function of its arguments: no I/O, no
//     globals, no time/random, no mutation of inputs. Same inputs, same outputs.
//   - The functions are unary-oriented: each stage in a pipeline takes exactly
//     one value and returns one value. This is the point-free shape the whole
//     module is built around.
//   - Composition ORDER is the one thing that distinguishes these helpers, so it
//     is pinned explicitly in each JSDoc and in the fixtures:
//       * `pipe` / `flow`  — LEFT-to-right (first fn listed runs first).
//       * `compose`        — RIGHT-to-left (last fn listed runs first; the
//                            classic mathematical `f . g` order).
//   - Empty-varargs is defined, never an error: `pipe(v)` returns `v`, and
//     `compose()` / `flow()` return the identity function. An empty pipeline is
//     the identity, the neutral element of composition — not a throw.

/**
 * Thread `value` left-to-right through a sequence of unary functions.
 *
 * Pure and stateless. Applies the first function to `value`, the second to that
 * result, and so on; the final result is returned. This is the value-first
 * (already-have-the-input) counterpart of the point-free {@link flow}.
 *
 * Order: LEFT-to-right — `pipe(v, f, g, h)` computes `h(g(f(v)))`, i.e. `f`
 * runs first.
 *
 * Empty-varargs edge case: with no functions, `pipe(v)` returns `v` unchanged
 * (an empty pipeline is the identity).
 *
 * @template T
 * @param {T} value the initial value fed into the pipeline
 * @param {...(function(any): any)} fns unary functions applied in order, first to last
 * @returns {any} the value after every function has been applied (or `value`
 *   itself when no functions are given)
 */
export function pipe(value, ...fns) {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Build a new function that applies `fns` RIGHT-to-left.
 *
 * Pure and stateless. Returns a unary function; calling it with an argument
 * feeds that argument to the LAST function in `fns`, then that result to the
 * second-to-last, and so on — the classic mathematical composition `f . g`,
 * where `compose(f, g)(x) === f(g(x))`.
 *
 * Order: RIGHT-to-left — `compose(f, g, h)(x)` computes `f(g(h(x)))`, i.e. `h`
 * runs first.
 *
 * Empty-varargs edge case: `compose()` returns a function with identity
 * behavior — it returns its single argument unchanged.
 *
 * @param {...(function(any): any)} fns unary functions composed right-to-left
 * @returns {function(any): any} a new unary function applying `fns` right-to-left
 */
export function compose(...fns) {
  return (x) => fns.reduceRight((acc, fn) => fn(acc), x);
}

/**
 * Build a new function that applies `fns` LEFT-to-right.
 *
 * Pure and stateless. Returns a unary function; calling it with an argument
 * feeds that argument to the FIRST function in `fns`, then that result to the
 * next, and so on. This is the point-free (defer-the-input) sibling of
 * {@link pipe}: `flow(f, g)(x) === pipe(x, f, g)`.
 *
 * Order: LEFT-to-right — `flow(f, g, h)(x)` computes `h(g(f(x)))`, i.e. `f`
 * runs first.
 *
 * Empty-varargs edge case: `flow()` returns a function with identity behavior —
 * it returns its single argument unchanged.
 *
 * @param {...(function(any): any)} fns unary functions composed left-to-right
 * @returns {function(any): any} a new unary function applying `fns` left-to-right
 */
export function flow(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

/**
 * Wrap `fn` so it runs for its side effect only, passing the original value
 * through untouched.
 *
 * Pure with respect to the pipeline value (the return of `fn` is DISCARDED); any
 * side effect belongs to `fn` itself, not to `tap`. Designed to be dropped into
 * a {@link pipe} / {@link flow} chain to observe or log an intermediate value
 * without altering it: the returned function calls `fn(x)` and then returns the
 * original `x`.
 *
 * @template T
 * @param {function(T): any} fn side-effecting function; its return value is ignored
 * @returns {function(T): T} a function that runs `fn(x)` and returns `x` unchanged
 */
export function tap(fn) {
  return (x) => {
    fn(x);
    return x;
  };
}

/**
 * Return the argument unchanged.
 *
 * Pure and stateless. The neutral element of composition: `flow(identity)` and
 * `compose(identity)` behave exactly like `identity`, and it is what an empty
 * `compose()` / `flow()` reduces to.
 *
 * @template T
 * @param {T} x any value
 * @returns {T} the same value `x`
 */
export function identity(x) {
  return x;
}
