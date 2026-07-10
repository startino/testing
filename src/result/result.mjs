// Result / Either — pure, stateless, dependency-free typed error handling.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/deep-equal/, src/duration/, src/unicode/,
// src/slug/, and src/flags/. Rationale: a Result type is pure ECMAScript over
// plain frozen objects — nothing to install, no build step, no runtime
// dependency.
//
// A `Result` models a computation that either SUCCEEDED with a value or FAILED
// with an error, WITHOUT using exceptions for control flow. It is one of:
//
//   Ok:  { ok: true,  value }   — success, carrying the produced value.
//   Err: { ok: false, error }   — failure, carrying the error (any value).
//
// Both variants are a plain tagged object, frozen with `Object.freeze` so a
// Result is immutable once constructed — you cannot mutate `.ok`, `.value`, or
// `.error` after the fact, and the combinators below always return a FRESH
// frozen Result rather than editing one in place.
//
// The contract, precisely:
//   - Every exported function is PURE: same inputs -> same output, no side
//     effects of its own (the caller's `fn` may of course do whatever it wants).
//   - Only two functions ever throw, and only deliberately:
//       * `unwrap(r)`   — throws the contained error on an Err (the escape hatch).
//       * `andThen(r, fn)` — throws a TypeError if `fn` returns a non-Result,
//                            because that is a programming error in the caller,
//                            not a runtime failure to be carried as an Err.
//     Every other function is total and never throws for a well-formed Result.
//   - Err values flow through `map` and Ok values flow through `mapErr`
//     untouched, so a pipeline transforms exactly one channel at a time.

/**
 * @template T
 * @typedef {{ readonly ok: true, readonly value: T }} Ok
 */

/**
 * @template E
 * @typedef {{ readonly ok: false, readonly error: E }} Err
 */

/**
 * @template T
 * @template E
 * @typedef {Ok<T> | Err<E>} Result
 */

/**
 * Construct a success Result carrying `value`. Frozen for immutability.
 *
 * @template T
 * @param {T} value
 * @returns {Ok<T>}
 */
export function ok(value) {
  return Object.freeze({ ok: true, value });
}

/**
 * Construct a failure Result carrying `error`. `error` can be any value (an
 * Error instance, a string, a tagged object) — Result does not constrain it.
 * Frozen for immutability.
 *
 * @template E
 * @param {E} error
 * @returns {Err<E>}
 */
export function err(error) {
  return Object.freeze({ ok: false, error });
}

/**
 * Type guard: is `r` an Ok? Narrows `r` to `Ok<T>` for the type checker.
 *
 * @template T
 * @template E
 * @param {Result<T, E>} r
 * @returns {r is Ok<T>}
 */
export function isOk(r) {
  return r.ok === true;
}

/**
 * Type guard: is `r` an Err? Narrows `r` to `Err<E>` for the type checker.
 *
 * @template T
 * @template E
 * @param {Result<T, E>} r
 * @returns {r is Err<E>}
 */
export function isErr(r) {
  return r.ok === false;
}

/**
 * Transform the value inside an Ok, leaving an Err untouched. This is the
 * "success channel" map: `map(ok(2), x => x + 1)` -> `ok(3)`, while
 * `map(err(e), fn)` -> the SAME Err (fn is never called). Returns a fresh Ok.
 *
 * @template T
 * @template U
 * @template E
 * @param {Result<T, E>} r
 * @param {(value: T) => U} fn
 * @returns {Result<U, E>}
 */
export function map(r, fn) {
  return r.ok ? ok(fn(r.value)) : r;
}

/**
 * Transform the error inside an Err, leaving an Ok untouched. The mirror of
 * `map` on the "error channel": `mapErr(err("x"), s => s.length)` -> `err(1)`,
 * while `mapErr(ok(v), fn)` -> the SAME Ok (fn is never called). Returns a
 * fresh Err.
 *
 * @template T
 * @template E
 * @template F
 * @param {Result<T, E>} r
 * @param {(error: E) => F} fn
 * @returns {Result<T, F>}
 */
export function mapErr(r, fn) {
  return r.ok ? r : err(fn(r.error));
}

/**
 * Monadic chain (a.k.a. flatMap / bind). On an Ok, call `fn(value)` — which must
 * ITSELF return a Result — and return that Result, letting you sequence
 * fallible steps where each may succeed or fail. On an Err, short-circuit: `fn`
 * is never called and the original Err flows straight through.
 *
 * Unlike `map`, `fn` returns a Result, so `andThen` does not double-wrap. If
 * `fn` returns something that is not a Result, that is a bug in the CALLER (the
 * chain contract was violated), so we throw a TypeError rather than silently
 * wrapping a malformed value — fail loud, fail early.
 *
 * @template T
 * @template U
 * @template E
 * @template F
 * @param {Result<T, E>} r
 * @param {(value: T) => Result<U, F>} fn
 * @returns {Result<U, E | F>}
 */
export function andThen(r, fn) {
  if (!r.ok) return r;
  const next = fn(r.value);
  if (!isResult(next)) {
    throw new TypeError(
      "andThen: fn must return a Result (ok(...) or err(...)), got " + describe(next),
    );
  }
  return next;
}

/**
 * Extract the Ok value, or return `fallback` for an Err. Total and never throws
 * — the safe way to leave the Result world with a default in hand.
 *
 * @template T
 * @template E
 * @template U
 * @param {Result<T, E>} r
 * @param {U} fallback
 * @returns {T | U}
 */
export function unwrapOr(r, fallback) {
  return r.ok ? r.value : fallback;
}

/**
 * Extract the Ok value, or THROW the contained error for an Err. This is the
 * one escape hatch back to exception-based control flow — the error is thrown
 * VERBATIM (the exact value passed to `err(...)`, whether an Error, a string, or
 * an object), so `try { unwrap(r) } catch (e)` sees precisely what failed.
 *
 * Use it only at a boundary where you have already decided a failure is fatal;
 * prefer `match` / `unwrapOr` everywhere a default or both-branch handling is
 * possible.
 *
 * @template T
 * @template E
 * @param {Result<T, E>} r
 * @returns {T}
 */
export function unwrap(r) {
  if (r.ok) return r.value;
  throw r.error;
}

/**
 * Exhaustive pattern match: call `handlers.ok(value)` for an Ok or
 * `handlers.err(error)` for an Err, and return whatever the chosen handler
 * returns. Both handlers must be provided, so every Result is handled — there
 * is no forgotten branch. Pure (aside from what the handlers themselves do).
 *
 * @template T
 * @template E
 * @template R
 * @param {Result<T, E>} r
 * @param {{ ok: (value: T) => R, err: (error: E) => R }} handlers
 * @returns {R}
 */
export function match(r, handlers) {
  return r.ok ? handlers.ok(r.value) : handlers.err(r.error);
}

/**
 * Lift a throwing (synchronous) function into the Result world. Returns a NEW
 * function with the same arguments that runs `fn(...args)` and returns
 * `ok(result)`, or — if `fn` throws — `err(thrown)` carrying the thrown value
 * verbatim. Sync only: an async `fn` returns a rejected Promise rather than
 * throwing, so its failure is not caught here (that is a distinct concern).
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {(...args: Parameters<F>) => Result<ReturnType<F>, unknown>}
 */
export function fromThrowable(fn) {
  return (...args) => {
    try {
      return ok(fn(...args));
    } catch (thrown) {
      return err(thrown);
    }
  };
}

/**
 * Internal: is `x` a well-formed Result produced by this module? A guard used
 * by `andThen` to enforce the chain contract. Checks the tagged shape rather
 * than identity so it stays robust; the `value`/`error` slot is required to
 * match the `ok` tag.
 *
 * @param {unknown} x
 * @returns {x is Result<unknown, unknown>}
 */
function isResult(x) {
  if (x === null || typeof x !== "object") return false;
  const r = /** @type {{ ok?: unknown }} */ (x);
  if (r.ok === true) return "value" in r;
  if (r.ok === false) return "error" in r;
  return false;
}

/**
 * Internal: a short human-readable description of a non-Result value, for the
 * TypeError message `andThen` throws. Keeps that message informative without
 * risking a throw from stringifying an exotic value.
 *
 * @param {unknown} x
 * @returns {string}
 */
function describe(x) {
  if (x === null) return "null";
  if (Array.isArray(x)) return "an array";
  return typeof x;
}
