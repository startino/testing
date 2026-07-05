# retry

Pure, **zero-runtime-dependency** async retry with exponential backoff and
optional full jitter. Node v24+ ESM, authored in TypeScript per
[ADR S0001](../../docs/adr/S0001-typescript-vitest-sanctioned-for-self-contained-src-leaf-libraries.md).

```ts
import { retry } from './retry.ts';

const data = await retry(() => fetchFlaky(), {
  retries: 5,
  minDelayMs: 100,
  factor: 2,
  shouldRetry: (err) => isTransient(err),
});
```

## API

```ts
retry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T>
```

Runs `fn`; on rejection, retries with backoff until it resolves, attempts are
exhausted, or `shouldRetry` declines — then rethrows the **last** underlying
error, unchanged (never wrapped or aggregated).

## Options

| Option        | Type                                        | Default        | Meaning |
| ------------- | ------------------------------------------- | -------------- | ------- |
| `retries`     | `number`                                    | `3`            | Additional retries after the first attempt. **Total attempts = `retries + 1`.** |
| `minDelayMs`  | `number`                                    | `100`          | Backoff floor (base for the first retry). |
| `maxDelayMs`  | `number`                                    | `30000`        | Backoff ceiling; the base is capped here **before** jitter. |
| `factor`      | `number`                                    | `2`            | Exponential base: uncapped base for retry `i` is `minDelayMs * factor ** i`. |
| `jitter`      | `boolean`                                   | `true`         | Full jitter. `false` = deterministic (delay is the capped base). |
| `shouldRetry` | `(err, attempt) => boolean`                 | `() => true`   | Retry predicate. `attempt` is the 1-based number of the attempt that just failed. A falsy verdict rethrows immediately. |
| `sleep`       | `(ms) => Promise<void>`                     | real `setTimeout` | Injectable sleep seam (inject a fake for instant, deterministic tests). |
| `random`      | `() => number`                              | `Math.random`  | Injectable RNG in `[0, 1)`; consulted **only** when `jitter` is `true`. |

## Semantics

- Runs `fn` up to `retries + 1` times.
- The wait before attempt _N_ uses `attemptIndex = N - 1`:
  `base = min(maxDelayMs, minDelayMs * factor ** attemptIndex)`.
  - `jitter: false` -> `delay = base` (deterministic).
  - `jitter: true`  -> `delay = random() * base`, uniformly in `[0, base)` for a
    `Math.random`-style source in `[0, 1)`.
- Because `base <= maxDelayMs` and jitter only scales **down**, no delay ever
  exceeds `maxDelayMs`.
- On rejection, if attempts remain **and** `shouldRetry(err, attempt)` is truthy,
  it sleeps the delay and retries; otherwise it rethrows the last error **by
  identity**. `shouldRetry -> false` short-circuits at once (no sleep, no further
  attempt).

## Determinism

With `jitter: false` the delay sequence is fully deterministic. With
`jitter: true`, inject `random` to make it deterministic under test. Inject
`sleep` to make the loop run with no wall-clock waits.

## Zero runtime dependencies

`retry.ts` imports nothing at runtime; its only ambient is the global
`setTimeout`, used solely as the default `sleep`. `typescript` and `vitest` are
**dev**-only, declared in this module's own `package.json` (not hoisted to the
repo root).

## Test

```sh
npm install   # installs typescript + vitest locally
npm test      # vitest run
npm run typecheck  # tsc --noEmit
```
