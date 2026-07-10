# pipe

Pure, stateless, **zero-dependency** function-composition helpers for Node v24+
(native ESM, typed via JSDoc). Follows the self-contained module shape
established by [`src/slug/`](../slug/) and [`src/duration/`](../duration/) and
the conventions fixed in [`CONTEXT.md`](../../CONTEXT.md).

## API

```js
import { pipe, compose, flow, tap, identity } from "./pipe.mjs";

const inc = (n) => n + 1;
const dbl = (n) => n * 2;

pipe(3, inc, dbl);            // 8            (left-to-right: dbl(inc(3)))
pipe(42);                     // 42           (no fns -> value unchanged)

compose(inc, dbl)(3);         // 7            (right-to-left: inc(dbl(3)))
flow(inc, dbl)(3);            // 8            (left-to-right: dbl(inc(3)))
compose()(99);                // 99           (empty -> identity)
flow()(99);                   // 99           (empty -> identity)

pipe(3, inc, tap(console.log), dbl); // logs 4, returns 8 (value passes through)
identity(5);                  // 5
```

### Functions

| function | order | returns |
| --- | --- | --- |
| `pipe(value, ...fns)` | left-to-right | `value` threaded through `fns`; `pipe(v)` -> `v` |
| `compose(...fns)` | right-to-left | a new unary fn; `compose(f, g)(x)` -> `f(g(x))`; `compose()` -> identity |
| `flow(...fns)` | left-to-right | a new unary fn; `flow(f, g)(x)` -> `g(f(x))`; `flow()` -> identity |
| `tap(fn)` | — | a fn that runs `fn(x)` for side effect and returns the original `x` |
| `identity(x)` | — | `x`, unchanged |

**Order at a glance**

- `pipe` and `flow` run the **first** function listed **first** (left-to-right).
- `compose` runs the **last** function listed **first** (right-to-left) — the
  classic mathematical `f . g`.
- `pipe` is value-first (you already have the input); `flow` is its point-free
  sibling: `flow(f, g)(x) === pipe(x, f, g)`.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random, no input mutation.
  Same input, same output.
- **Empty-varargs is the identity** — `pipe(v)` returns `v`; `compose()` and
  `flow()` return a function that returns its argument unchanged. An empty
  pipeline is the neutral element of composition, never a throw.
- **`tap` is value-transparent** — the wrapped function's return value is
  discarded; the original value always passes through, so `tap` can observe or
  log an intermediate value inside a chain without altering it.

## Test

```sh
cd src/pipe && npm test      # node --test (zero deps)
```

All behavioral cases live once in [`fixtures.mjs`](./fixtures.mjs); the suite in
[`__tests__/pipe.test.mjs`](./__tests__/pipe.test.mjs) is table-driven plus
explicit order, empty-varargs, `tap` side-effect/pass-through, and `identity`
guards.
