// Event emitter — a tiny, zero-dependency, in-process pub/sub.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/result/, src/deep-equal/, src/duration/,
// src/unicode/, src/slug/, and src/flags/. Rationale: an event emitter is pure
// ECMAScript over a `Map` and arrays — nothing to install, no build step, no
// runtime dependency.
//
// `createEmitter()` returns a fresh, independent emitter. Each emitter owns a
// private `Map<eventKey, listener[]>` — the event key may be a STRING or a
// SYMBOL (anything usable as a Map key), and per event the listeners are held
// in a plain array so REGISTRATION ORDER is preserved for `emit`.
//
// The contract, precisely:
//   - `on(event, listener)` registers `listener` for `event` and returns an
//     unsubscribe function that removes EXACTLY this registration (not every
//     copy of the same function reference — one call, one registration).
//   - `once(event, listener)` registers a one-shot: the wrapper is removed
//     BEFORE the underlying listener is invoked, so it fires at most once even
//     if the listener re-enters `emit` for the same event. Also returns an
//     unsubscribe function (which cancels it before it ever fires).
//   - `off(event, listener)` removes ONE registration matching `listener` (the
//     first, in registration order). A `once` listener is matched by the
//     original function you passed, not the internal wrapper.
//   - `emit(event, ...args)` invokes every current listener for `event` in
//     registration order with `...args`, iterating over a COPY of the list so
//     `off` / `once` / `clear` mutations during dispatch cannot corrupt the
//     in-flight iteration. Returns `true` if at least one listener fired, else
//     `false`.
//   - `clear(event?)` removes all listeners for `event`, or ALL events when
//     called with no argument.
//   - `listenerCount(event)` reports how many listeners are registered for
//     `event`.
//
// Error isolation: a throwing listener never blocks the listeners that come
// after it. `emit` runs every listener, collects any thrown values, and — only
// after the whole dispatch completes — throws an `AggregateError` carrying them
// (even a single thrown value is wrapped, so the failure mode is uniform).
// The emitter's own state is never left corrupted by a throwing listener.

/**
 * @typedef {string | symbol} EventKey
 * An event is keyed by a string or a symbol — anything a Map can key on.
 */

/**
 * @callback Listener
 * @param {...any} args
 * @returns {void}
 */

/**
 * @callback Unsubscribe
 * @returns {void}
 * Idempotent: removes the registration it was handed out for; calling it more
 * than once (or after the listener was already removed by `off`/`clear`) is a
 * harmless no-op.
 */

/**
 * @typedef {object} Emitter
 * @property {(event: EventKey, listener: Listener) => Unsubscribe} on
 * @property {(event: EventKey, listener: Listener) => Unsubscribe} once
 * @property {(event: EventKey, listener: Listener) => void} off
 * @property {(event: EventKey, ...args: any[]) => boolean} emit
 * @property {(event?: EventKey) => void} clear
 * @property {(event: EventKey) => number} listenerCount
 */

/**
 * Create a fresh event emitter. Each call returns an independent instance with
 * its own private listener registry — two emitters never share state.
 *
 * @returns {Emitter}
 */
export function createEmitter() {
  // The registry: event key -> ordered list of listeners. A Map (not a plain
  // object) so symbol keys work and there is no prototype-pollution surface.
  /** @type {Map<EventKey, Listener[]>} */
  const registry = new Map();

  /**
   * Fetch the listener array for `event`, creating it on first use. Empty
   * arrays are pruned eagerly by the removers below, so a present key always
   * means at least one live listener.
   *
   * @param {EventKey} event
   * @returns {Listener[]}
   */
  function bucket(event) {
    let list = registry.get(event);
    if (list === undefined) {
      list = [];
      registry.set(event, list);
    }
    return list;
  }

  /**
   * Remove the FIRST registration equal to `listener` from `event`. Returns
   * whether something was removed. Prunes the bucket when it empties so
   * `listenerCount` and re-registration start clean.
   *
   * @param {EventKey} event
   * @param {Listener} listener
   * @returns {boolean}
   */
  function remove(event, listener) {
    const list = registry.get(event);
    if (list === undefined) return false;
    const i = list.indexOf(listener);
    if (i === -1) return false;
    list.splice(i, 1);
    if (list.length === 0) registry.delete(event);
    return true;
  }

  /**
   * Register `listener` for `event` in registration order. The returned
   * function removes exactly this registration when first called, and is a
   * no-op thereafter.
   *
   * @param {EventKey} event
   * @param {Listener} listener
   * @returns {Unsubscribe}
   */
  function on(event, listener) {
    bucket(event).push(listener);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      remove(event, listener);
    };
  }

  /**
   * Register a one-shot listener. The internal `wrapper` is removed BEFORE the
   * real `listener` runs, so it cannot re-fire even if `listener` re-enters
   * `emit(event, ...)` synchronously (re-entrancy safety). `off(event,
   * listener)` cancels it by the ORIGINAL function — a marker on the wrapper
   * lets `off` find it. The returned unsubscribe cancels it before it fires.
   *
   * @param {EventKey} event
   * @param {Listener} listener
   * @returns {Unsubscribe}
   */
  function once(event, listener) {
    /** @type {Listener & { __original__?: Listener }} */
    const wrapper = (...args) => {
      // Remove first — this is what makes `once` safe against re-entrancy.
      remove(event, wrapper);
      listener(...args);
    };
    // Tag the wrapper so `off(event, listener)` can locate it by the original.
    wrapper.__original__ = listener;
    return on(event, wrapper);
  }

  /**
   * Remove one listener registration for `event`. Matches a plain listener
   * directly, or a `once` wrapper by its original function — so
   * `off(event, fn)` cancels a `once(event, fn)` you never let fire. Removes a
   * single matching registration (the first, in registration order).
   *
   * @param {EventKey} event
   * @param {Listener} listener
   * @returns {void}
   */
  function off(event, listener) {
    const list = registry.get(event);
    if (list === undefined) return;
    // Find a direct match OR a once-wrapper whose original is `listener`.
    const i = list.findIndex(
      (l) => l === listener || /** @type {any} */ (l).__original__ === listener,
    );
    if (i === -1) return;
    list.splice(i, 1);
    if (list.length === 0) registry.delete(event);
  }

  /**
   * Invoke every listener registered for `event`, in registration order, with
   * `...args`. Iterates over a SNAPSHOT of the listener list, so a listener that
   * calls `off` / `once` / `clear` mid-dispatch does not disturb who else runs
   * in THIS emit (the snapshot is fixed at call time). Returns whether any
   * listener fired.
   *
   * Error isolation: every listener runs even if an earlier one threw; thrown
   * values are collected and, once dispatch finishes, re-thrown together as an
   * `AggregateError` (a single throw is wrapped too, for a uniform failure
   * shape).
   *
   * @param {EventKey} event
   * @param {...any} args
   * @returns {boolean}
   */
  function emit(event, ...args) {
    const list = registry.get(event);
    if (list === undefined || list.length === 0) return false;
    // Snapshot: mutations during dispatch must not corrupt this iteration.
    const snapshot = list.slice();
    /** @type {unknown[]} */
    const errors = [];
    for (const listener of snapshot) {
      try {
        listener(...args);
      } catch (thrown) {
        errors.push(thrown);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `emit(${String(event)}): ${errors.length} listener(s) threw`,
      );
    }
    return true;
  }

  /**
   * Remove all listeners for `event`, or — with no argument — every listener
   * for every event, resetting the emitter to empty.
   *
   * @param {EventKey} [event]
   * @returns {void}
   */
  function clear(event) {
    if (arguments.length === 0) {
      registry.clear();
      return;
    }
    registry.delete(/** @type {EventKey} */ (event));
  }

  /**
   * Number of listeners currently registered for `event` (0 for an unknown
   * event). A `once` listener counts until it fires.
   *
   * @param {EventKey} event
   * @returns {number}
   */
  function listenerCount(event) {
    const list = registry.get(event);
    return list === undefined ? 0 : list.length;
  }

  return Object.freeze({ on, once, off, emit, clear, listenerCount });
}
