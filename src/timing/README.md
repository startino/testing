# timing

Pure, **zero-dependency** debounce / throttle timing utility for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/slug/`](../slug/), [`src/flags/`](../flags/), and [`src/unicode/`](../unicode/)
and the conventions fixed in [`CONTEXT.md`](../../CONTEXT.md).

Semantics are lodash-faithful — the proven contract for `leading` / `trailing` /
`maxWait` edges and the `cancel` / `flush` / `pending` control methods.

## API

```js
import { debounce, throttle } from "./timing.mjs";

// Debounce: collapse a burst into one trailing call, with the LAST args.
const save = debounce((doc) => persist(doc), 300);
save(v1);
save(v2);
save(v3);            // only v3 is persisted, 300ms after the last call

// Leading edge: fire immediately, ignore the rest of the window.
const onScrollStart = debounce(handler, 200, { leading: true, trailing: false });

// maxWait: never starve fn longer than 1000ms under a continuous stream.
const flushMetrics = debounce(send, 300, { maxWait: 1000 });

// Throttle: at most once per 100ms (leading + trailing by default).
const onResize = throttle(recompute, 100);

// Control methods (on both debounce and throttle):
save.pending();      // -> boolean: is a trailing invocation scheduled?
save.flush();        // -> invoke any pending call now, return its result
save.cancel();       // -> drop any pending call and reset state
```

### `debounce(fn, wait?, opts?) -> debounced`

Delays invoking `fn` until `wait` ms have elapsed since the last invocation of
`debounced`. The invocation uses the args and `this` of the **most recent** call.

| aspect | behavior |
| --- | --- |
| coerce | `wait` via `Number(wait) || 0`; NaN / negative / non-numeric => `0` |
| leading | `opts.leading` (default `false`) — invoke on the leading edge |
| trailing | `opts.trailing` (default `true`) — invoke on the trailing edge |
| both false | `fn` is never invoked (documented lodash quirk) |
| both true | fires on leading AND once more on trailing when >1 call in the window |
| `opts.maxWait` | optional upper bound on delay; clamped to `>= wait`; forces an invoke under a continuous stream |
| args/`this` | the most recent call's args and `this` are used; result returned from `debounced()` / `flush()` |
| clock guard | a backwards system clock (`sinceLastCall < 0`) is treated as "should invoke" |
| throws | `TypeError` if `fn` is not a function |

**Methods on the returned function**

| method | returns | effect |
| --- | --- | --- |
| `.cancel()` | `void` | cancel any pending trailing invocation and reset internal state |
| `.flush()` | last result | invoke any pending trailing call immediately; no-op returning the last result if nothing is pending |
| `.pending()` | `boolean` | whether a trailing invocation is currently scheduled |

### `throttle(fn, wait?, opts?) -> throttled`

Ensures `fn` is invoked at most once per `wait` ms. Implemented as
`debounce(fn, wait, { leading, trailing, maxWait: wait })` — the `maxWait === wait`
bound is exactly what turns a debounce into a throttle.

| aspect | behavior |
| --- | --- |
| leading | `opts.leading` (default `true`) — fire immediately on the first call |
| trailing | `opts.trailing` (default `true`) — fire on the trailing edge |
| maxWait | fixed to `wait` internally — guarantees at-least-once-per-`wait` firing |
| methods | inherits `.cancel()`, `.flush()`, `.pending()` from the underlying debounce |
| throws | `TypeError` if `fn` is not a function |

## Properties

- **Zero-dependency** — only Node stdlib (`Date.now`, `setTimeout`, `clearTimeout`).
  No runtime and no test dependencies.
- **lodash-faithful** — the leading/trailing/maxWait state machine and the
  cancel/flush/pending controls match the de-facto standard callers expect.
- **Most-recent-call wins** — `fn` always runs with the args and `this` of the
  latest call in the window, never a stale earlier one.
- **Defensive coercion** — `Number(wait) || 0`; NaN / negative / non-numeric wait
  all degrade to `0` rather than throwing.
- **Clock-skew safe** — a backwards system clock never wedges the timer; it is
  treated as "enough time elapsed".
- **Throttle is derived debounce** — one state machine, two sets of defaults.

## Test

From the **repo root**:

```sh
npm test --prefix src/timing
```

Tests are **deterministic and fast** — they use Node's built-in mock timers with
both the timer APIs and `Date` faked, so `Date.now()` advances in lockstep with
`t.mock.timers.tick(ms)` and no test sleeps in real time. All reusable scaffolding
(the `spy` factory, the `WAIT` / `MAX_WAIT` constants) lives once in
[`fixtures.mjs`](./fixtures.mjs); the suite in
[`__tests__/timing.test.mjs`](./__tests__/timing.test.mjs) covers debounce
trailing/leading edges, `maxWait` forcing and clamping, `cancel` / `flush` /
`pending`, `this`-binding and argument forwarding, throttle rate-limiting and
leading-fire, and the `TypeError` / `wait`-coercion robustness guards.

> Do **not** pass a bare directory to `node --test` (e.g.
> `node --test __tests__/`): on Node 24 that fails with `MODULE_NOT_FOUND`. Use
> bare `node --test` (auto-discovers `*.test.mjs`), an explicit glob, or an
> explicit file path.
