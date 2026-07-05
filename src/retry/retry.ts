// Async `retry` — a pure, zero-runtime-dependency control-flow primitive.
//
// Runtime: Node.js v24+ with native ESM, authored in TypeScript per ADR S0001
// ("TypeScript + vitest sanctioned for self-contained src/ leaf libraries").
// This module imports NOTHING at runtime: the only ambient it touches is the
// global `setTimeout`, used solely as the default of the injectable `sleep`
// seam. Inject `sleep` (and `random`) to make it fully deterministic and
// wall-clock-free under test.

/**
 * Options for {@link retry}. Every field is optional; the defaults implement a
 * standard exponential-backoff-with-full-jitter policy.
 */
export interface RetryOptions {
  /**
   * Number of ADDITIONAL retries after the first attempt. Total attempts =
   * `retries + 1`. `retries: 0` means a single attempt with no retry.
   * @default 3
   */
  retries?: number;

  /**
   * Backoff floor in milliseconds — the base delay for the first retry
   * (`attemptIndex` 0), before the exponential factor and cap are applied.
   * @default 100
   */
  minDelayMs?: number;

  /**
   * Backoff ceiling in milliseconds. The exponential base is capped at this
   * value BEFORE jitter, so no computed delay (jittered or not) ever exceeds it.
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * Exponential base. The uncapped base for retry `attemptIndex` i is
   * `minDelayMs * factor ** i`.
   * @default 2
   */
  factor?: number;

  /**
   * Full-jitter switch. When `false`, each delay is exactly the capped base
   * (deterministic). When `true`, each delay is `random() * base`, uniformly in
   * `[0, base)` for a `Math.random`-style source in `[0, 1)` — still capped,
   * since `base <= maxDelayMs`.
   * @default true
   */
  jitter?: boolean;

  /**
   * Predicate deciding whether a rejection is retryable. Called with the error
   * that was thrown and the 1-based number of the attempt that just failed.
   * A falsy verdict short-circuits immediately: no sleep, no further attempt —
   * the error is rethrown at once. A truthy verdict allows a retry if attempts
   * remain.
   * @default () => true
   */
  shouldRetry?: (err: unknown, attempt: number) => boolean;

  /**
   * Injectable sleep seam. Called with the computed delay in milliseconds and
   * must resolve after (at least) that long. Defaults to a real `setTimeout`.
   * Inject a spy/fake to make the retry loop deterministic and instantaneous
   * under test.
   * @default (ms) => new Promise((r) => setTimeout(r, ms))
   */
  sleep?: (ms: number) => Promise<void>;

  /**
   * Injectable randomness seam for full jitter. Must return a number in
   * `[0, 1)`, like `Math.random`. Consulted ONLY when `jitter` is `true`;
   * with `jitter: false` it is never called, so that path is deterministic
   * regardless of this seam.
   * @default Math.random
   */
  random?: () => number;
}

const DEFAULTS = {
  retries: 3,
  minDelayMs: 100,
  maxDelayMs: 30_000,
  factor: 2,
  jitter: true,
  shouldRetry: () => true,
  sleep: (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
} satisfies Required<RetryOptions>;

/**
 * Compute the delay (ms) to wait before the retry at `attemptIndex`
 * (0 = the wait before attempt #2). Exported for testing the backoff schedule
 * directly. The base is `min(maxDelayMs, minDelayMs * factor ** attemptIndex)`;
 * with jitter, the returned delay is `random() * base` — in `[0, base)` for a
 * `Math.random`-style source in `[0, 1)`, and never above `maxDelayMs`.
 */
export function computeDelay(
  attemptIndex: number,
  opts: Required<
    Pick<RetryOptions, 'minDelayMs' | 'maxDelayMs' | 'factor' | 'jitter' | 'random'>
  >,
): number {
  const uncapped = opts.minDelayMs * opts.factor ** attemptIndex;
  const base = Math.min(opts.maxDelayMs, uncapped);
  return opts.jitter ? opts.random() * base : base;
}

/**
 * Run `fn`; on rejection, retry with exponential backoff and (optionally) full
 * jitter until it resolves, attempts are exhausted, or `shouldRetry` declines.
 *
 * Semantics:
 * - Runs `fn` up to `retries + 1` times total.
 * - After a rejection, if attempts remain AND `shouldRetry(err, attempt)` is
 *   truthy, it sleeps the computed backoff delay (via the injectable `sleep`)
 *   and retries. Otherwise it rethrows the LAST underlying error BY IDENTITY —
 *   never wrapped or aggregated.
 * - Deterministic when `jitter` is `false` (or when `random` is injected).
 *
 * @typeParam T The resolved value type of the thunk.
 * @param fn An async thunk to (re)invoke. Its rejection drives the retry loop.
 * @param opts See {@link RetryOptions}.
 * @returns The first successful result of `fn`.
 * @throws The last error `fn` rejected with, unchanged, once attempts are
 *   exhausted or `shouldRetry` declines.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  // Resolve each field with `??` (NOT `{ ...DEFAULTS, ...opts }`): an object
  // spread copies keys whose value is `undefined`, so a caller forwarding
  // `{ retries: undefined }` would otherwise clobber the default. `??` keeps
  // the default for an absent OR explicitly-undefined field. For every in-spec
  // call the result is identical to a plain merge.
  const cfg: Required<RetryOptions> = {
    retries: opts.retries ?? DEFAULTS.retries,
    minDelayMs: opts.minDelayMs ?? DEFAULTS.minDelayMs,
    maxDelayMs: opts.maxDelayMs ?? DEFAULTS.maxDelayMs,
    factor: opts.factor ?? DEFAULTS.factor,
    jitter: opts.jitter ?? DEFAULTS.jitter,
    shouldRetry: opts.shouldRetry ?? DEFAULTS.shouldRetry,
    sleep: opts.sleep ?? DEFAULTS.sleep,
    random: opts.random ?? DEFAULTS.random,
  };

  // Clamp so the first attempt ALWAYS runs: `Math.floor` guards non-integer
  // `retries`, `Math.max(1, …)` guards negative `retries` (both of which would
  // otherwise skip the loop entirely and let a phantom `undefined` escape).
  const maxAttempts = Math.max(1, Math.floor(cfg.retries) + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const attemptsRemain = attempt < maxAttempts;
      if (!attemptsRemain || !cfg.shouldRetry(err, attempt)) {
        throw err;
      }
      // attempt is 1-based; the wait before attempt N uses attemptIndex N-1.
      await cfg.sleep(computeDelay(attempt - 1, cfg));
    }
  }

  // Genuinely unreachable now: `maxAttempts >= 1`, so the loop runs at least
  // once and either returns on success or throws on the final attempt. This
  // guard exists only to satisfy definite-return analysis and must never fire.
  throw new Error('retry: unreachable');
}

export default retry;
