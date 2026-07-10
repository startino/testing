// Co-located test suite for the timing (debounce/throttle) module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir):  npm test  (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Determinism: every test uses Node's built-in mock timers, enabling BOTH the
// timer APIs AND `Date`, so that `Date.now()` (which the debounce elapsed-time
// math relies on) advances in lockstep with `t.mock.timers.tick(ms)`. Nothing
// here sleeps in real time; the whole suite is instant and reproducible.
//
// All reusable scaffolding (the `spy` factory, the WAIT/MAX_WAIT constants)
// lives ONCE in ../fixtures.mjs; this file only wires and asserts.

import test from "node:test";
import assert from "node:assert/strict";

import { debounce, throttle } from "../timing.mjs";
import { spy, WAIT, MAX_WAIT } from "../fixtures.mjs";

/**
 * Enable fake timers + fake Date for a test context.
 *
 * NOTE: the mock-timers `apis` list takes `"setTimeout"` (which also fakes its
 * paired `clearTimeout`) and `"Date"`; `"clearTimeout"` is NOT a standalone
 * enable-able api name on Node 24 and passing it throws ERR_INVALID_ARG_VALUE.
 * Faking `setTimeout` transparently fakes `clearTimeout`, and faking `Date`
 * makes `Date.now()` advance with `tick()`.
 */
function useFakeTimers(t) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
}

// --- debounce: trailing-only (the default) ---------------------------------

test("debounce trailing-only: N rapid calls => ONE invoke after wait, LAST args", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT); // leading:false, trailing:true (defaults)

  d("a");
  d("b");
  d("c");
  assert.equal(fn.calls, 0, "nothing fires before the window elapses");

  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 1, "exactly one trailing invocation");
  assert.deepEqual(fn.args[0], ["c"], "uses the args of the MOST RECENT call");
});

test("debounce trailing-only: separated calls each fire their own trailing", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT);

  d("first");
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 1);

  d("second");
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 2);
  assert.deepEqual(fn.args[1], ["second"]);
});

// --- debounce: leading edge ------------------------------------------------

test("debounce leading:true, trailing:false: fires immediately, not again", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT, { leading: true, trailing: false });

  d("x");
  assert.equal(fn.calls, 1, "leading edge fires synchronously");
  d("y"); // still within the window
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 1, "trailing disabled => no second invoke");
  assert.deepEqual(fn.args[0], ["x"]);
});

test("debounce leading:true, trailing:true: fires on leading AND trailing when >1 call", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT, { leading: true, trailing: true });

  d("lead");
  assert.equal(fn.calls, 1, "leading edge");
  d("tail"); // second call in the window arms the trailing edge
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 2, "trailing edge fires once more");
  assert.deepEqual(fn.args[0], ["lead"]);
  assert.deepEqual(fn.args[1], ["tail"]);
});

test("debounce leading:true with a SINGLE call: no redundant trailing invoke", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT, { leading: true, trailing: true });

  d("only");
  assert.equal(fn.calls, 1, "leading fired");
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 1, "one call => leading consumed it, no trailing");
});

// --- debounce: maxWait -----------------------------------------------------

test("maxWait: continuous calls faster than wait still force an invoke by maxWait", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT, { maxWait: MAX_WAIT }); // trailing default

  // Call every WAIT/2 ms forever; without maxWait the trailing edge would be
  // pushed back indefinitely and fn would never fire.
  const step = WAIT / 2;
  let elapsed = 0;
  let n = 0;
  while (elapsed < MAX_WAIT) {
    d("call-" + n);
    n += 1;
    t.mock.timers.tick(step);
    elapsed += step;
  }

  assert.ok(fn.calls >= 1, `maxWait forced at least one invoke (got ${fn.calls})`);
});

test("maxWait is clamped to >= wait (smaller maxWait behaves as wait)", (t) => {
  useFakeTimers(t);
  const fn = spy();
  // maxWait smaller than wait is meaningless; it must be raised to wait and NOT
  // fire before `wait` elapses.
  const d = debounce(fn, WAIT, { maxWait: 10 });

  d("a");
  t.mock.timers.tick(WAIT - 1);
  assert.equal(fn.calls, 0, "did not fire before wait despite tiny maxWait");
  t.mock.timers.tick(1);
  assert.equal(fn.calls, 1);
});

// --- debounce: cancel / flush / pending ------------------------------------

test(".cancel() prevents the pending trailing call", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT);

  d("dropped");
  assert.equal(d.pending(), true);
  d.cancel();
  assert.equal(d.pending(), false);
  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 0, "cancel dropped the trailing invocation");
});

test(".flush() invokes the pending call immediately and returns its result", (t) => {
  useFakeTimers(t);
  const fn = spy("RESULT");
  const d = debounce(fn, WAIT);

  d("now");
  assert.equal(fn.calls, 0);
  const out = d.flush();
  assert.equal(fn.calls, 1, "flush invoked immediately");
  assert.equal(out, "RESULT", "flush returns fn's result");
  assert.deepEqual(fn.args[0], ["now"]);
  assert.equal(d.pending(), false);
});

test(".flush() with nothing pending is a no-op returning the last result", (t) => {
  useFakeTimers(t);
  const fn = spy("R1");
  const d = debounce(fn, WAIT);

  d("a");
  t.mock.timers.tick(WAIT); // fires trailing, result recorded
  assert.equal(fn.calls, 1);
  const out = d.flush(); // nothing pending now
  assert.equal(fn.calls, 1, "no extra invoke");
  assert.equal(out, "R1", "returns the last result");
});

test(".pending() reflects scheduled state across the window", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT);

  assert.equal(d.pending(), false, "idle before any call");
  d("x");
  assert.equal(d.pending(), true, "scheduled after a call");
  t.mock.timers.tick(WAIT);
  assert.equal(d.pending(), false, "cleared after the trailing invoke");
});

// --- debounce: this binding + argument forwarding --------------------------

test("this binding and argument forwarding are preserved (most recent call wins)", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const d = debounce(fn, WAIT);
  const ctx = { id: "context" };

  d.call(ctx, 1, 2);
  d.call(ctx, 3, 4); // most recent call
  t.mock.timers.tick(WAIT);

  assert.equal(fn.calls, 1);
  assert.deepEqual(fn.args[0], [3, 4], "forwards the LAST args");
  assert.equal(fn.thisArgs[0], ctx, "preserves `this`");
});

// --- throttle --------------------------------------------------------------

test("throttle default leading:true fires immediately", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const th = throttle(fn, WAIT);

  th("go");
  assert.equal(fn.calls, 1, "leading edge is on by default for throttle");
  assert.deepEqual(fn.args[0], ["go"]);
});

test("throttle: at most once per wait across a burst, with leading + trailing edges", (t) => {
  useFakeTimers(t);
  const fn = spy();
  const th = throttle(fn, WAIT); // leading:true, trailing:true

  // A burst of calls faster than the window.
  th("a"); // leading fires now
  assert.equal(fn.calls, 1);
  th("b");
  th("c");
  assert.equal(fn.calls, 1, "no second invoke mid-window");

  t.mock.timers.tick(WAIT);
  assert.equal(fn.calls, 2, "trailing edge fires once at the window boundary");
  assert.deepEqual(fn.args[1], ["c"], "trailing uses the most recent args");

  // Over a longer continuous stream, the rate stays bounded to ~once/wait.
  fn.reset();
  const before = fn.calls;
  for (let i = 0; i < 4; i += 1) {
    th("stream-" + i);
    t.mock.timers.tick(WAIT); // one full window per iteration
  }
  assert.ok(
    fn.calls - before <= 5,
    `throttled to roughly once per window (got ${fn.calls - before})`,
  );
});

test("throttle inherits cancel/flush/pending", (t) => {
  useFakeTimers(t);
  const fn = spy("TR");
  const th = throttle(fn, WAIT);

  th("a"); // leading fires (calls=1); trailing armed for the 2nd call
  th("b");
  assert.equal(th.pending(), true);
  const out = th.flush();
  assert.equal(out, "TR");
  assert.equal(th.pending(), false);
  assert.equal(fn.calls, 2, "leading + flushed trailing");
});

// --- robustness ------------------------------------------------------------

test("TypeError when fn is not a function (debounce and throttle)", () => {
  for (const bad of [null, undefined, 123, "x", {}, []]) {
    assert.throws(() => debounce(bad), TypeError);
    assert.throws(() => throttle(bad), TypeError);
  }
});

test("wait coercion: NaN / negative / non-numeric degrade to 0 (fires on next tick)", (t) => {
  useFakeTimers(t);
  for (const badWait of [NaN, undefined, "not-a-number", -50]) {
    const fn = spy();
    const d = debounce(fn, badWait); // trailing default
    d("v");
    t.mock.timers.tick(0); // a zero-length wait fires on the next timer tick
    assert.equal(fn.calls, 1, `wait=${String(badWait)} behaved as 0`);
  }
});
