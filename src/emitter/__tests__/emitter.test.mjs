// Co-located test suite for the emitter module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every emitter/listener setup lives ONCE in ../fixtures.mjs; this file only
// drives the built cases and asserts the observed effect.

import test from "node:test";
import assert from "node:assert/strict";

import { createEmitter } from "../emitter.mjs";
import {
  EMIT_ARG_CASES,
  SENTINEL_ARG,
  buildOrderCase,
  buildOnceCase,
  buildOffCase,
  buildUnsubscribeOnCase,
  buildUnsubscribeOnceCase,
  buildClearCase,
  buildThrowingCase,
  buildMultiThrowCase,
  buildMutateDuringEmitCase,
} from "../fixtures.mjs";

// 1. on + emit — a registered listener fires with exactly the args emitted,
//    for string AND symbol keys, and with zero, one, or many args.
for (const { name, event, args, build } of EMIT_ARG_CASES) {
  test(`emit args: ${name}`, () => {
    const { emitter, calls } = build();
    const fired = emitter.emit(event, ...args);
    assert.equal(fired, true); // a listener was present, so emit returns true
    assert.equal(calls.length, 1); // fired exactly once
    assert.deepEqual(calls[0], args); // received precisely the emitted args
  });
}

// 1b. Object args flow through by identity (===), not a structural copy.
test("emit forwards object args by identity", () => {
  const emitter = createEmitter();
  let received;
  emitter.on("obj", (x) => {
    received = x;
  });
  emitter.emit("obj", SENTINEL_ARG);
  assert.equal(received, SENTINEL_ARG); // same reference
});

// 2. Multiple listeners on one event fire in REGISTRATION ORDER.
test("multiple listeners fire in registration order", () => {
  const { emitter, event, calls, expectedOrder } = buildOrderCase();
  emitter.emit(event);
  const order = calls.map((c) => c[0]);
  assert.deepEqual(order, expectedOrder);
});

// 3. once — fires exactly once; a second emit does nothing.
test("once fires exactly once across two emits", () => {
  const { emitter, event, calls } = buildOnceCase();
  assert.equal(emitter.listenerCount(event), 1); // registered before firing

  const first = emitter.emit(event, "a");
  assert.equal(first, true);
  assert.equal(calls.length, 1); // fired once
  assert.equal(emitter.listenerCount(event), 0); // auto-removed after firing

  const second = emitter.emit(event, "b");
  assert.equal(second, false); // nothing left to fire
  assert.equal(calls.length, 1); // still just the one invocation
});

// 4. off — removes one specific listener; the other survives and fires.
test("off removes one listener and leaves the rest", () => {
  const { emitter, event, calls, removeMe } = buildOffCase();
  assert.equal(emitter.listenerCount(event), 2);

  emitter.off(event, removeMe);
  assert.equal(emitter.listenerCount(event), 1);

  emitter.emit(event);
  assert.equal(calls.length, 1); // only the survivor fired
  assert.equal(calls[0][0], "kept");
});

// 4b. off can cancel a `once` by the ORIGINAL function (before it fires).
test("off cancels a once listener by its original function", () => {
  const emitter = createEmitter();
  const calls = [];
  const fn = () => calls.push("fired");
  emitter.once("evt", fn);
  assert.equal(emitter.listenerCount("evt"), 1);
  emitter.off("evt", fn); // matched by the original, not the internal wrapper
  assert.equal(emitter.listenerCount("evt"), 0);
  assert.equal(emitter.emit("evt"), false);
  assert.equal(calls.length, 0);
});

// 5. The unsubscribe fn returned by `on` removes exactly that registration.
test("unsubscribe from on removes the registration", () => {
  const { emitter, event, calls, unsubscribe } = buildUnsubscribeOnCase();
  assert.equal(emitter.listenerCount(event), 1);
  unsubscribe();
  assert.equal(emitter.listenerCount(event), 0);
  assert.equal(emitter.emit(event), false);
  assert.equal(calls.length, 0);
});

// 5b. The unsubscribe fn is idempotent — a second call is a harmless no-op.
test("unsubscribe is idempotent", () => {
  const { emitter, event, unsubscribe } = buildUnsubscribeOnCase();
  unsubscribe();
  assert.doesNotThrow(() => unsubscribe()); // second call no-ops
  assert.equal(emitter.listenerCount(event), 0);
});

// 5c. The unsubscribe fn returned by `once` cancels it before it ever fires.
test("unsubscribe from once cancels before firing", () => {
  const { emitter, event, calls, unsubscribe } = buildUnsubscribeOnceCase();
  assert.equal(emitter.listenerCount(event), 1);
  unsubscribe();
  assert.equal(emitter.listenerCount(event), 0);
  assert.equal(emitter.emit(event), false);
  assert.equal(calls.length, 0);
});

// 6. clear(event) drops only that event; clear() drops everything.
test("clear(event) removes only the named event", () => {
  const { emitter, calls } = buildClearCase();
  assert.equal(emitter.listenerCount("a"), 2);
  assert.equal(emitter.listenerCount("b"), 1);

  emitter.clear("a");
  assert.equal(emitter.listenerCount("a"), 0); // cleared
  assert.equal(emitter.listenerCount("b"), 1); // untouched

  emitter.emit("a");
  emitter.emit("b");
  assert.equal(calls.length, 1); // only b's listener fired
  assert.equal(calls[0][0], "b");
});

test("clear() with no argument removes all events", () => {
  const { emitter, calls } = buildClearCase();
  emitter.clear(); // no arg -> wipe everything
  assert.equal(emitter.listenerCount("a"), 0);
  assert.equal(emitter.listenerCount("b"), 0);
  assert.equal(emitter.emit("a"), false);
  assert.equal(emitter.emit("b"), false);
  assert.equal(calls.length, 0);
});

// 7. listenerCount — reflects registrations and is 0 for unknown events.
test("listenerCount reflects registrations and unknown events", () => {
  const emitter = createEmitter();
  assert.equal(emitter.listenerCount("nope"), 0); // never registered
  const off1 = emitter.on("e", () => {});
  const off2 = emitter.on("e", () => {});
  assert.equal(emitter.listenerCount("e"), 2);
  off1();
  assert.equal(emitter.listenerCount("e"), 1);
  off2();
  assert.equal(emitter.listenerCount("e"), 0);
});

// 8. emit on an unknown event is a no-op returning false.
test("emit on an unknown event is a no-op returning false", () => {
  const emitter = createEmitter();
  assert.equal(emitter.emit("never-registered", 1, 2, 3), false);
});

// 9. Error isolation — a throwing listener does not block later listeners, and
//    the throw surfaces as an AggregateError after the whole dispatch.
test("a throwing listener does not block later listeners", () => {
  const { emitter, event, calls, thrown, expectedOrder } = buildThrowingCase();
  let caught;
  assert.throws(
    () => emitter.emit(event),
    (e) => {
      caught = e;
      return e instanceof AggregateError;
    },
  );
  // Both flanking listeners still ran, in order — the middle throw was isolated.
  assert.deepEqual(calls.map((c) => c[0]), expectedOrder);
  // The AggregateError carries the exact thrown value.
  assert.ok(caught.errors.includes(thrown));
  assert.equal(caught.errors.length, 1);
});

// 9b. Multiple throwing listeners — the AggregateError collects ALL of them.
test("emit collects all thrown errors into the AggregateError", () => {
  const { emitter, event, thrownA, thrownB } = buildMultiThrowCase();
  let caught;
  assert.throws(
    () => emitter.emit(event),
    (e) => {
      caught = e;
      return e instanceof AggregateError;
    },
  );
  assert.equal(caught.errors.length, 2);
  assert.deepEqual(caught.errors, [thrownA, thrownB]); // in registration order
});

// 10. Mutating listeners during emit — a listener that calls `off` mid-dispatch
//     does not corrupt the in-flight iteration (snapshot semantics): the
//     already-snapshotted listener still fires this emit, but is gone next emit.
test("mutation during emit does not corrupt the in-flight dispatch", () => {
  const { emitter, event, calls, second } = buildMutateDuringEmitCase();

  // First emit: `first` runs, removes `second`, but `second` is in the snapshot
  // so it STILL fires this round.
  emitter.emit(event);
  assert.deepEqual(calls, [["first"], ["second"]]);
  assert.equal(emitter.listenerCount(event), 1); // second was removed for next time

  // Second emit: only `first` remains registered.
  calls.length = 0;
  emitter.emit(event);
  assert.deepEqual(calls, [["first"]]);
  void second;
});

// 11. Emitters are independent — one emitter's listeners never fire on another.
test("separate emitters share no state", () => {
  const a = createEmitter();
  const b = createEmitter();
  let aFired = 0;
  a.on("evt", () => aFired++);
  assert.equal(b.emit("evt"), false); // b has no listener for "evt"
  assert.equal(aFired, 0);
  assert.equal(a.emit("evt"), true);
  assert.equal(aFired, 1);
});
