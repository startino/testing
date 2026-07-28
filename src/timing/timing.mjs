// Debounce / throttle timing utility — pure, lodash-faithful, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/slug/, src/unicode/, and src/flags/.
// Rationale: rate-limiting an arbitrary function needs nothing beyond three
// stdlib globals — `Date.now()` (a monotonic-enough wall clock for elapsed-time
// math), `setTimeout`, and `clearTimeout`. There is no I/O, no third-party
// scheduler, no build step. The proven contract we reproduce is lodash's, because
// its leading/trailing/maxWait state machine has been battle-tested for a decade
// and its edge-case behavior (the maxWait "force-invoke" fairness guarantee, the
// backwards-clock guard, argument/`this` capture of the MOST RECENT call) is the
// de-facto standard callers already expect.
//
// Why NOT a naive `setTimeout`-reset debounce: the naive version cannot express
// leading-edge invocation, cannot bound worst-case latency (`maxWait`), and
// silently drops the caller's `this`/arguments. The lodash internal structure
// (lastArgs / lastThis / lastCallTime / lastInvokeTime / timerId / result plus
// the invoke / leadingEdge / remainingWait / shouldInvoke / timerExpired /
// trailingEdge helpers) is the minimal shape that makes all four features fall
// out of ONE timer and a handful of timestamps.
//
// Core invariants this module upholds:
//   - `fn` runs with the args and `this` of the LATEST `debounced()` call in the
//     window, never a stale earlier call.
//   - `wait` is coerced defensively: `Number(wait) || 0`, so NaN / negative /
//     non-numeric wait all degrade to 0 (invoke-on-next-tick), never throw.
//   - A backwards system clock (NTP step, VM clock skew) is treated as "enough
//     time has passed" rather than wedging the timer forever.
//   - `throttle` is literally `debounce` with `maxWait === wait` and a
//     leading-default of `true` — the same state machine, different defaults.

/**
 * Render a rejected argument for a `TypeError` message: strings are quoted so an
 * empty/whitespace value is visible, everything else is coerced with `String`.
 * Mirrors the sibling modules' argument-validation message convention.
 *
 * Total by construction: coercion is guarded, so a hostile argument (a
 * null-prototype object, or one whose `toString`/`valueOf` throws) still yields
 * a string here instead of replacing the caller's `TypeError` with an unrelated
 * error from the message-building step.
 *
 * @param {any} v the value to describe
 * @returns {string} a short, human-readable rendering of `v`
 */
function stringify(v) {
  try {
    return typeof v === "string" ? JSON.stringify(v) : String(v);
  } catch {
    return `[un-stringifiable ${typeof v}]`;
  }
}

/**
 * Create a debounced wrapper around `fn`.
 *
 * Delays invoking `fn` until `wait` ms have elapsed since the last time the
 * debounced function was invoked. The invocation always uses the arguments and
 * `this` of the MOST RECENT call within the window (lodash semantics), and the
 * return value of the last real `fn` invocation is handed back from `debounced()`
 * and `flush()`.
 *
 * Edges (controlled by `opts.leading` / `opts.trailing`):
 *   - leading: invoke on the leading edge (immediately, on the first call of a
 *     new window). Default `false`.
 *   - trailing: invoke on the trailing edge (after the window goes quiet).
 *     Default `true`.
 *   - If BOTH are false, `fn` is never invoked (a documented lodash quirk).
 *   - If BOTH are true and >1 call occurred in the window, `fn` fires on the
 *     leading edge AND once more on the trailing edge.
 *
 * `opts.maxWait` (optional): an upper bound, in ms, on how long `fn` may be
 * starved by a continuous stream of calls. Without it, a caller invoking faster
 * than `wait` forever would postpone the trailing invocation forever; with it,
 * `fn` is force-invoked at least once per `maxWait`. Clamped to `>= wait` (a
 * maxWait smaller than wait is meaningless and is raised to wait).
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn the function to debounce
 * @param {number} [wait=0] delay in ms; coerced `Number(wait) || 0`
 * @param {{ leading?: boolean, trailing?: boolean, maxWait?: number }} [opts]
 * @returns {F & { cancel(): void, flush(): any, pending(): boolean }}
 *   the debounced function, augmented with `.cancel()`, `.flush()`, `.pending()`
 * @throws {TypeError} if `fn` is not a function
 */
export function debounce(fn, wait = 0, opts = {}) {
  if (typeof fn !== "function") {
    throw new TypeError(
      `debounce: "fn" must be a function, got ${stringify(fn)}`,
    );
  }

  // Coerce wait defensively: NaN / negative / non-numeric all collapse to 0.
  // (`Number(wait) || 0` maps NaN and 0 alike to 0; a negative number is left
  // as-is here but behaves as "already elapsed" in the elapsed-time math below,
  // which is the intended 0-ish behavior.)
  wait = Number(wait) || 0;

  const leading = Boolean(opts.leading); // default false
  // trailing defaults to true: only an explicit `false` disables it.
  const trailing = "trailing" in opts ? Boolean(opts.trailing) : true;

  const hasMaxWait = "maxWait" in opts && opts.maxWait != null;
  // maxWait is clamped to >= wait: a bound tighter than the debounce window is
  // meaningless, so we raise it. Also coerced through Number() for safety.
  const maxWait = hasMaxWait ? Math.max(Number(opts.maxWait) || 0, wait) : 0;

  // --- Internal state (the classic lodash fields) --------------------------
  let lastArgs; // arguments of the most recent debounced() call, undefined when consumed
  let lastThis; // `this` of the most recent debounced() call
  let lastCallTime; // Date.now() at the most recent debounced() call
  let lastInvokeTime = 0; // Date.now() at the most recent real fn() invocation
  let timerId; // the active setTimeout handle, or undefined when idle
  let result; // return value of the most recent real fn() invocation

  /**
   * Actually call `fn` with the captured args/this, record the invoke time, and
   * clear the captured args (so a stale window cannot re-fire them).
   * @param {number} time the Date.now() timestamp to record as the invoke time
   * @returns {any} fn's return value
   */
  function invoke(time) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = undefined; // consume — nothing pending after this
    lastInvokeTime = time;
    result = fn.apply(thisArg, args);
    return result;
  }

  /**
   * Handle the leading edge of a fresh window: record the invoke-window start,
   * arm the trailing timer, and invoke immediately iff `leading` is enabled.
   * @param {number} time now
   * @returns {any} the (possibly updated) last result
   */
  function leadingEdge(time) {
    // Anchor the maxWait window to the start of THIS burst.
    lastInvokeTime = time;
    // Arm the trailing-edge timer regardless; it will decide what to do on fire.
    timerId = setTimeout(timerExpired, wait);
    // Invoke on the leading edge only if asked; otherwise just return last result.
    return leading ? invoke(time) : result;
  }

  /**
   * How long the timer should sleep before the next check, honoring BOTH the
   * remaining debounce window and (if set) the remaining maxWait budget — the
   * timer fires at whichever comes first.
   * @param {number} time now
   * @returns {number} ms until the next timer check
   */
  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return hasMaxWait
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  /**
   * Decide whether enough time has elapsed to invoke `fn` on the trailing edge.
   * True when any of: first-ever call, the debounce window elapsed, the system
   * clock jumped backwards (defensive), or the maxWait budget is exhausted.
   * @param {number} time now
   * @returns {boolean}
   */
  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === undefined || // very first call
      timeSinceLastCall >= wait || // full window elapsed since last call
      timeSinceLastCall < 0 || // backwards clock — treat as elapsed, never wedge
      (hasMaxWait && timeSinceLastInvoke >= maxWait) // maxWait budget spent
    );
  }

  /**
   * The setTimeout callback. If it is time to fire, run the trailing edge;
   * otherwise re-arm the timer for exactly the remaining wait (this is how a
   * stream of calls keeps pushing the trailing edge back without over-firing).
   */
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Not yet — sleep for the precise remaining time and re-check.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  /**
   * Handle the trailing edge: clear the timer, then invoke iff `trailing` is
   * enabled AND there are captured args pending (a leading-only window that
   * already consumed its args must NOT fire again here).
   * @param {number} time now
   * @returns {any} the last result
   */
  function trailingEdge(time) {
    timerId = undefined;
    // Only invoke on trailing if enabled and we actually have a pending call.
    if (trailing && lastArgs) {
      return invoke(time);
    }
    // Otherwise just drop the captured args and return the last result.
    lastArgs = lastThis = undefined;
    return result;
  }

  /**
   * The public debounced function. Captures args/this, and drives the state
   * machine: opens a window (leading edge) when idle, or re-arms / force-invokes
   * (maxWait) while a window is open.
   * @this {any}
   * @param {...any} args
   * @returns {any} the most recent fn result
   */
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    // Capture the LATEST args/this — this is what makes fn see the most recent
    // call rather than the first.
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        // Idle -> open a new window on the leading edge.
        return leadingEdge(lastCallTime);
      }
      if (hasMaxWait) {
        // A window is already open and maxWait says fire NOW: invoke and re-arm
        // the timer so the trailing edge is still honored.
        timerId = setTimeout(timerExpired, wait);
        return invoke(lastCallTime);
      }
    }
    // A window is open and it is not yet time to fire; ensure a timer exists.
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  /**
   * Cancel any pending trailing invocation and reset ALL internal state back to
   * idle. Safe to call when nothing is pending.
   */
  debounced.cancel = function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  };

  /**
   * Immediately invoke any pending trailing call and return its result. A no-op
   * (returning the last result) when nothing is pending.
   * @returns {any}
   */
  debounced.flush = function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  };

  /**
   * @returns {boolean} whether a trailing invocation is currently scheduled.
   */
  debounced.pending = function pending() {
    return timerId !== undefined;
  };

  return /** @type {any} */ (debounced);
}

/**
 * Create a throttled wrapper around `fn`: `fn` is invoked at most once per
 * `wait` ms.
 *
 * Implemented as `debounce(fn, wait, { leading, trailing, maxWait: wait })` —
 * the maxWait bound equal to the window is exactly what turns a debounce into a
 * throttle (a continuous stream still fires once per `wait`). The only behavioral
 * difference from `debounce` is the DEFAULT of `leading`, which is `true` here so
 * that a throttled function fires immediately on the first call.
 *
 * Inherits `.cancel()`, `.flush()`, and `.pending()` from the underlying
 * debounce.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn the function to throttle
 * @param {number} [wait=0] the throttle window in ms; coerced `Number(wait) || 0`
 * @param {{ leading?: boolean, trailing?: boolean }} [opts]
 *   - `leading` (default `true`): fire on the leading edge.
 *   - `trailing` (default `true`): fire on the trailing edge.
 * @returns {F & { cancel(): void, flush(): any, pending(): boolean }}
 * @throws {TypeError} if `fn` is not a function
 */
export function throttle(fn, wait = 0, opts = {}) {
  if (typeof fn !== "function") {
    throw new TypeError(
      `throttle: "fn" must be a function, got ${stringify(fn)}`,
    );
  }

  // leading defaults to true for throttle (unlike debounce); trailing defaults
  // to true. Only an explicit `false` disables either edge.
  const leading = "leading" in opts ? Boolean(opts.leading) : true;
  const trailing = "trailing" in opts ? Boolean(opts.trailing) : true;

  // A throttle IS a debounce whose maxWait equals its wait: the maxWait budget
  // guarantees at-least-once-per-wait firing even under a continuous call stream.
  return debounce(fn, wait, { leading, trailing, maxWait: wait });
}
