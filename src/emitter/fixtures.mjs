// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the emitter test cases. Because an emitter is
// STATEFUL (unlike the pure Result module), the interesting inputs here are
// mostly builders/thunks rather than plain data: each case constructs a fresh
// emitter and the listeners it needs, so the test file only drives them and
// asserts the observed effect — it never wires up an emitter inline.
//
// A recurring helper, `recorder()`, returns a listener plus the log it appends
// to, so a test can assert BOTH that a listener fired and WITH WHAT, in order.

import { createEmitter } from "./emitter.mjs";

/**
 * A listener that records each call into `calls` as the array of args it
 * received. Returned alongside its log so a test can assert invocation order
 * and payloads. An optional `tag` lets several recorders share one log while
 * staying distinguishable (used for registration-order proofs).
 *
 * @param {unknown[]} calls  shared log the listener appends to
 * @param {string} [tag]     label prefixed to this recorder's entries
 * @returns {(...args: any[]) => void}
 */
export function recorder(calls, tag) {
  return (...args) => {
    calls.push(tag === undefined ? args : [tag, ...args]);
  };
}

// A distinct symbol event key, to prove the emitter keys on symbols as well as
// strings (Map semantics, not object-property coercion).
export const SYMBOL_EVENT = Symbol("sym-event");

// A sentinel object passed as an emit arg to prove args flow through by
// identity (===), not by copy.
export const SENTINEL_ARG = Object.freeze({ id: "sentinel" });

/**
 * `on` + `emit` argument-forwarding cases. Each builds an emitter with one
 * recorder, emits `args`, and expects the recorder to have been called exactly
 * once with those same args (asserted deeply / by identity in the suite).
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   event: string | symbol,
 *   args: unknown[],
 *   build: () => { emitter: import("./emitter.mjs").Emitter, calls: unknown[] },
 * }>}
 */
export const EMIT_ARG_CASES = Object.freeze([
  {
    name: "passes a single primitive arg",
    event: "hello",
    args: ["world"],
    build: () => {
      const calls = [];
      const emitter = createEmitter();
      emitter.on("hello", recorder(calls));
      return { emitter, calls };
    },
  },
  {
    name: "passes multiple args in order",
    event: "sum",
    args: [1, 2, 3],
    build: () => {
      const calls = [];
      const emitter = createEmitter();
      emitter.on("sum", recorder(calls));
      return { emitter, calls };
    },
  },
  {
    name: "passes an object arg by identity",
    event: "obj",
    args: [SENTINEL_ARG],
    build: () => {
      const calls = [];
      const emitter = createEmitter();
      emitter.on("obj", recorder(calls));
      return { emitter, calls };
    },
  },
  {
    name: "emit with zero args still fires the listener",
    event: "ping",
    args: [],
    build: () => {
      const calls = [];
      const emitter = createEmitter();
      emitter.on("ping", recorder(calls));
      return { emitter, calls };
    },
  },
  {
    name: "keys on a symbol event",
    event: SYMBOL_EVENT,
    args: ["via-symbol"],
    build: () => {
      const calls = [];
      const emitter = createEmitter();
      emitter.on(SYMBOL_EVENT, recorder(calls));
      return { emitter, calls };
    },
  },
]);

/**
 * Builds an emitter with three tagged recorders on the SAME event, all writing
 * to one shared `calls` log, so a single emit proves listeners fire in
 * REGISTRATION ORDER. `expectedOrder` is the tag sequence emit must produce.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   expectedOrder: string[],
 * }}
 */
export function buildOrderCase() {
  const calls = [];
  const emitter = createEmitter();
  emitter.on("evt", recorder(calls, "a"));
  emitter.on("evt", recorder(calls, "b"));
  emitter.on("evt", recorder(calls, "c"));
  return { emitter, event: "evt", calls, expectedOrder: ["a", "b", "c"] };
}

/**
 * Builds an emitter with a single `once` listener. Two emits are expected: the
 * first fires it, the second is a no-op. `calls` collects invocations so the
 * suite asserts exactly one entry after both emits.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 * }}
 */
export function buildOnceCase() {
  const calls = [];
  const emitter = createEmitter();
  emitter.once("boot", recorder(calls));
  return { emitter, event: "boot", calls };
}

/**
 * Builds an emitter with two listeners; the suite removes ONE via `off` and
 * emits, expecting only the survivor to fire. Returns the live listener refs so
 * the test can name which one to remove.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   removeMe: (...a: any[]) => void,
 *   keepMe: (...a: any[]) => void,
 * }}
 */
export function buildOffCase() {
  const calls = [];
  const emitter = createEmitter();
  const removeMe = recorder(calls, "removed");
  const keepMe = recorder(calls, "kept");
  emitter.on("data", removeMe);
  emitter.on("data", keepMe);
  return { emitter, event: "data", calls, removeMe, keepMe };
}

/**
 * Builds an emitter with one listener registered via `on`, returning the
 * unsubscribe fn so the suite can prove calling it removes the registration
 * (listenerCount drops to 0 and a subsequent emit is a no-op).
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   unsubscribe: () => void,
 * }}
 */
export function buildUnsubscribeOnCase() {
  const calls = [];
  const emitter = createEmitter();
  const unsubscribe = emitter.on("x", recorder(calls));
  return { emitter, event: "x", calls, unsubscribe };
}

/**
 * Same as buildUnsubscribeOnCase but for `once`: the returned unsubscribe must
 * cancel the one-shot BEFORE it ever fires.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   unsubscribe: () => void,
 * }}
 */
export function buildUnsubscribeOnceCase() {
  const calls = [];
  const emitter = createEmitter();
  const unsubscribe = emitter.once("x", recorder(calls));
  return { emitter, event: "x", calls, unsubscribe };
}

/**
 * Builds an emitter with listeners on TWO events, so the suite can prove
 * `clear(event)` drops only the named event while the other survives, and
 * `clear()` (no arg) drops everything.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   calls: unknown[],
 * }}
 */
export function buildClearCase() {
  const calls = [];
  const emitter = createEmitter();
  emitter.on("a", recorder(calls, "a"));
  emitter.on("a", recorder(calls, "a2"));
  emitter.on("b", recorder(calls, "b"));
  return { emitter, calls };
}

/**
 * Builds an emitter whose middle listener THROWS, flanked by recorders, so the
 * suite proves error isolation: both flanking listeners still run, and emit
 * throws an AggregateError carrying the thrown value(s).
 *
 * `thrown` is the exact value the middle listener throws (asserted to appear in
 * the AggregateError's `.errors`).
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   thrown: Error,
 *   expectedOrder: string[],
 * }}
 */
export function buildThrowingCase() {
  const calls = [];
  const emitter = createEmitter();
  const thrown = new Error("listener-boom");
  emitter.on("go", recorder(calls, "before"));
  emitter.on("go", () => {
    throw thrown;
  });
  emitter.on("go", recorder(calls, "after"));
  return { emitter, event: "go", calls, thrown, expectedOrder: ["before", "after"] };
}

/**
 * Builds an emitter where TWO listeners throw distinct errors, to prove the
 * AggregateError collects ALL of them (not just the first), in order.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   thrownA: Error,
 *   thrownB: Error,
 * }}
 */
export function buildMultiThrowCase() {
  const emitter = createEmitter();
  const thrownA = new Error("boom-A");
  const thrownB = new Error("boom-B");
  emitter.on("go", () => {
    throw thrownA;
  });
  emitter.on("go", () => {
    throw thrownB;
  });
  return { emitter, event: "go", thrownA, thrownB };
}

/**
 * Builds an emitter whose first listener REMOVES the second (via `off`) during
 * dispatch, proving emit iterates a snapshot: the second listener — already in
 * the in-flight snapshot — still fires THIS emit, but is gone for the NEXT one.
 *
 * @returns {{
 *   emitter: import("./emitter.mjs").Emitter,
 *   event: string,
 *   calls: unknown[],
 *   second: (...a: any[]) => void,
 * }}
 */
export function buildMutateDuringEmitCase() {
  const calls = [];
  const emitter = createEmitter();
  const second = recorder(calls, "second");
  // First listener unregisters `second` mid-dispatch.
  emitter.on("evt", () => {
    calls.push(["first"]);
    emitter.off("evt", second);
  });
  emitter.on("evt", second);
  return { emitter, event: "evt", calls, second };
}
