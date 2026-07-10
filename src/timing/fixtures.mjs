// Runtime: Node.js v24+ (ESM). Pure stdlib, zero test dependencies.
//
// Single source of truth for the timing test helpers and constants. The spy
// factory and the shared WAIT constants are defined ONCE here and imported by
// the test suite — no copy-paste of test scaffolding across the test file. Keep
// every reusable test primitive here so the suite in __tests__/ only wires and
// asserts.

/** Canonical debounce/throttle window used across the suite (ms). */
export const WAIT = 100;

/** A window strictly larger than WAIT, used for maxWait scenarios (ms). */
export const MAX_WAIT = 300;

/**
 * A recording spy function. The returned function records every call — its
 * arguments, its `this`, and the value it returned — and lets the test set the
 * return value the spy hands back. Zero-dependency: it is a plain closure over
 * an accumulator object exposed as `.calls`.
 *
 * @param {any} [returnValue] the value the spy returns from each call (settable
 *   later via `spy.returns(v)`).
 * @returns {((...args: any[]) => any) & {
 *   calls: number,
 *   args: any[][],
 *   thisArgs: any[],
 *   results: any[],
 *   returns(v: any): void,
 *   reset(): void,
 * }} the spy function augmented with its recording fields and controls.
 */
export function spy(returnValue) {
  /** @this {any} */
  function fn(...args) {
    fn.calls += 1;
    fn.args.push(args);
    fn.thisArgs.push(this);
    const r = fn._returnValue;
    fn.results.push(r);
    return r;
  }

  fn.calls = 0;
  /** @type {any[][]} */
  fn.args = [];
  /** @type {any[]} */
  fn.thisArgs = [];
  /** @type {any[]} */
  fn.results = [];
  fn._returnValue = returnValue;

  /** Set the value the spy returns from subsequent calls. */
  fn.returns = (v) => {
    fn._returnValue = v;
  };

  /** Clear all recorded call data (keeps the current return value). */
  fn.reset = () => {
    fn.calls = 0;
    fn.args = [];
    fn.thisArgs = [];
    fn.results = [];
  };

  return fn;
}
