// Function composition helpers — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/deep-equal/, src/duration/, src/unicode/,
// src/slug/, src/flags/, and src/result/. Rationale: function composition is
// pure ECMAScript over plain functions — nothing to install, no build step, no
// runtime dependency.
//
// These helpers thread a value through a sequence of UNARY functions (each
// takes one argument and returns one value), so a pipeline reads as a flat list
// of transformations instead of a nest of parentheses. The contract, precisely:
//
//   - Every exported function is PURE: same inputs -> same output, and the
//     helper itself has no side effects (the caller's `fn`s may of course do
//     whatever they want — that is what `tap` exists to accommodate).
//   - `flow` and `compose` return a NEW, REUSABLE function that closes over the
//     given fns; calling it many times is safe and side-effect-free (again,
//     modulo what the caller's fns do). They never mutate the fns array.
//   - The empty-varargs edges are total and well-defined: `pipe(v)` returns `v`,
//     `flow()` and `compose()` are the identity function. No special-casing at
//     the call site is ever required.
//   - `flow` and `compose` are mirror images: for the same list of fns,
//     `compose(...fns)` applies them in the REVERSE order of `flow(...fns)`.

/**
 * Return `x` unchanged. The identity function — the neutral element of
 * composition, and what `flow()` / `compose()` collapse to with no fns.
 *
 * @template T
 * @param {T} x
 * @returns {T}
 */
export function identity(x) {
  return x;
}

/**
 * Thread `value` left-to-right through the given unary functions, feeding each
 * function's result into the next: `pipe(v, f, g)` computes `g(f(v))`. With no
 * functions, `pipe(v)` returns `v` unchanged.
 *
 * This is the eager, value-first form — it runs immediately and returns the
 * final result. Use `flow` when you want a reusable function instead of a
 * one-shot result.
 *
 * @template T
 * @param {T} value  the starting value fed into the first fn.
 * @param {...(arg: any) => any} fns  unary functions applied in order, left to right.
 * @returns {any} the value after every fn has been applied (or `value` if none).
 */
export function pipe(value, ...fns) {
  // reduce threads the accumulator (acc) through each fn in array order, which
  // is left-to-right — exactly the pipe semantics. No fns -> reduce returns the
  // seed `value` untouched.
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Return a NEW unary function that applies the given functions left-to-right:
 * `flow(f, g)(x)` computes `g(f(x))`. `flow()` (no fns) is the identity
 * function. The returned function is reusable and pure — call it as many times
 * as you like.
 *
 * `flow` is the point-free sibling of `pipe`: `pipe(x, ...fns)` equals
 * `flow(...fns)(x)`, but `flow` hands you the composed function to reuse or pass
 * around rather than running it once.
 *
 * @param {...(arg: any) => any} fns  unary functions to apply in order, left to right.
 * @returns {(value: any) => any} a reusable function threading its argument through `fns`.
 */
export function flow(...fns) {
  return (value) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Return a NEW unary function that applies the given functions RIGHT-to-left:
 * `compose(f, g)(x)` computes `f(g(x))` — the classic mathematical composition
 * order, where the rightmost function runs first. `compose()` (no fns) is the
 * identity function. The returned function is reusable and pure.
 *
 * `compose` is the mirror image of `flow`: for the same list of fns it applies
 * them in the reverse order. Reach for `compose` when you want to read a
 * pipeline the mathematical way (outermost fn written first); reach for `flow`
 * when you want to read it in execution order.
 *
 * @param {...(arg: any) => any} fns  unary functions to apply in order, right to left.
 * @returns {(value: any) => any} a reusable function threading its argument through `fns` in reverse.
 */
export function compose(...fns) {
  // reduceRight walks the array from the last fn to the first, i.e. applies the
  // rightmost fn first — the defining property of compose. No fns -> the seed
  // `value` is returned untouched, so compose() is identity.
  return (value) => fns.reduceRight((acc, fn) => fn(acc), value);
}

/**
 * Return a unary function that runs `fn(x)` FOR ITS SIDE EFFECT and then returns
 * the ORIGINAL `x` unchanged — the return value of `fn` is discarded. This lets
 * you splice an effect (a log, a metric, a mutation of external state) into a
 * pipeline without breaking the flow of the value:
 *
 *   pipe(user, validate, tap(logMetrics), save)  // logMetrics sees the user,
 *                                                 // but `save` still gets it.
 *
 * `tap` is the one helper here deliberately built to accommodate impurity: the
 * WRAPPER is pure (it always returns its input), but `fn` is expected to do
 * something observable — that is the whole point.
 *
 * @template T
 * @param {(value: T) => unknown} fn  the side-effecting fn; its result is ignored.
 * @returns {(value: T) => T} a fn that runs `fn(x)` and returns `x` unchanged.
 */
export function tap(fn) {
  return (value) => {
    fn(value);
    return value;
  };
}
