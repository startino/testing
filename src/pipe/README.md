# pipe

Pure, stateless, **zero-dependency** function-composition helpers for Node v24+
(native ESM, typed via JSDoc). Follows the self-contained module shape
established by [`src/deep-equal/`](../deep-equal/),
[`src/duration/`](../duration/), [`src/unicode/`](../unicode/),
[`src/slug/`](../slug/), [`src/flags/`](../flags/), and
[`src/result/`](../result/).

These helpers thread a value through a sequence of **unary** functions (each
takes one argument, returns one value), so a pipeline reads as a flat list of
transformations instead of a nest of parentheses.

## API

```js
import { pipe, flow, compose, tap, identity } from "./pipe.mjs";

const inc = (x) => x + 1;
const double = (x) => x * 2;

pipe(3, inc, double);              // 8    — (3 + 1) * 2, left-to-right
pipe(3);                           // 3    — no fns, value returned unchanged

const f = flow(inc, double);       // reusable fn, left-to-right
f(3);                              // 8
flow()(3);                         // 3    — identity

const g = compose(inc, double);    // reusable fn, RIGHT-to-left
g(3);                              // 7    — inc(double(3)) = inc(6)
compose()(3);                      // 3    — identity

const logged = tap((x) => console.log(x));
logged(42);                        // logs 42, returns 42 unchanged

identity(42);                      // 42
```

## Semantics

- **`pipe(value, ...fns)`** — thread `value` left-to-right through the unary
  `fns`, feeding each result into the next: `pipe(v, f, g)` computes `g(f(v))`.
  With no fns, `pipe(v)` returns `v` unchanged. Eager: runs immediately and
  returns the final result.
- **`flow(...fns)`** — return a NEW reusable unary fn applying `fns`
  left-to-right: `flow(f, g)(x)` computes `g(f(x))`. `flow()` is the identity
  function. Point-free sibling of `pipe`: `pipe(x, ...fns) === flow(...fns)(x)`.
- **`compose(...fns)`** — return a NEW reusable unary fn applying `fns`
  **right-to-left** (classic mathematical order, rightmost runs first):
  `compose(f, g)(x)` computes `f(g(x))`. `compose()` is the identity function.
  The mirror image of `flow` — for the same fn list it applies them in reverse.
- **`tap(fn)`** — return a unary fn that runs `fn(x)` for its **side effect**
  and returns the ORIGINAL `x` unchanged (`fn`'s return value is discarded).
  Splices an effect (log, metric, external mutation) into a pipeline without
  breaking the flow of the value.
- **`identity(x)`** — return `x` unchanged. The neutral element of composition,
  and what `flow()` / `compose()` collapse to with no fns.

Every function is pure: same inputs -> same output, with no side effect of its
own (`tap` deliberately accommodates an impure `fn`, but the wrapper itself
always returns its input). `flow` and `compose` return reusable functions that
hold no per-call state.

## Test

```sh
npm test          # node --test  (built-in runner, zero deps)
```

All test inputs and expectations live once in [`fixtures.mjs`](./fixtures.mjs);
[`__tests__/pipe.test.mjs`](./__tests__/pipe.test.mjs) only asserts.
