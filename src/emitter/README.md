# emitter

Pure, **zero-dependency** tiny event emitter for Node v24+ (native ESM, typed
via JSDoc). Follows the self-contained module shape established by
[`src/result/`](../result/), [`src/deep-equal/`](../deep-equal/),
[`src/duration/`](../duration/), [`src/unicode/`](../unicode/),
[`src/slug/`](../slug/), and [`src/flags/`](../flags/).

`createEmitter()` returns a fresh, independent in-process pub/sub. Each emitter
owns a private `Map<eventKey, listener[]>` — event keys may be **strings or
symbols**, and listeners are held per event in registration order.

## API

```js
import { createEmitter } from "./emitter.mjs";

const bus = createEmitter();

// on(event, listener) -> unsubscribe()
const off = bus.on("tick", (n) => console.log("tick", n));
bus.emit("tick", 1);                 // logs "tick 1"; returns true
off();                               // removes exactly this registration

// once(event, listener) -> unsubscribe()
bus.once("boot", () => console.log("booted"));
bus.emit("boot");                    // logs "booted"
bus.emit("boot");                    // no-op (already fired); returns false

// off(event, listener)
const fn = () => {};
bus.on("data", fn);
bus.off("data", fn);                 // removes one matching registration

// emit(event, ...args) -> boolean (did any listener fire)
bus.emit("unknown");                 // false — no listeners

// clear(event?) — one event, or (no arg) ALL events
bus.clear("tick");
bus.clear();

// listenerCount(event) -> number
bus.listenerCount("tick");           // 0

// symbol event keys work too
const CHANNEL = Symbol("channel");
bus.on(CHANNEL, (msg) => {});
bus.emit(CHANNEL, "hi");
```

## Semantics

- **`createEmitter()`** — a fresh emitter with its own private registry; two
  emitters never share state.
- **`on(event, listener)`** — register `listener` for `event` in registration
  order. Returns an **unsubscribe** function that removes exactly this
  registration; it is idempotent (a second call is a no-op).
- **`once(event, listener)`** — register a one-shot. The internal wrapper is
  removed **before** the listener runs, so it fires at most once even if the
  listener re-enters `emit` for the same event (re-entrancy safety). Returns an
  unsubscribe function that cancels it before it fires.
- **`off(event, listener)`** — remove **one** matching registration (the first,
  in registration order). A `once` listener is matched by the **original**
  function you passed, not the internal wrapper — so `off(event, fn)` cancels a
  `once(event, fn)`.
- **`emit(event, ...args)`** — invoke every current listener for `event` in
  registration order with `...args`. Iterates over a **snapshot** of the listener
  list, so a listener that calls `off` / `once` / `clear` mid-dispatch cannot
  corrupt the in-flight iteration (mutations take effect on the next emit).
  Returns `true` if at least one listener fired, else `false`.
- **`clear(event?)`** — remove all listeners for `event`, or **all** events when
  called with no argument.
- **`listenerCount(event)`** — number of listeners registered for `event` (0 for
  an unknown event; a `once` listener counts until it fires).

### Error isolation

If a listener **throws**, the remaining listeners still run — a throw never
blocks later listeners. `emit` collects every thrown value and, once the whole
dispatch has completed, throws an **`AggregateError`** carrying them (a single
throw is wrapped too, for a uniform failure shape). The emitter's own state is
never left corrupted by a throwing listener.

```js
bus.on("go", () => { throw new Error("boom"); });
bus.on("go", () => console.log("still runs"));
try {
  bus.emit("go");                    // "still runs" is logged first
} catch (e) {
  e instanceof AggregateError;       // true
  e.errors;                          // [Error: boom]
}
```

## Test

```sh
npm test          # node --test  (built-in runner, zero deps)
```

All test setup lives once in [`fixtures.mjs`](./fixtures.mjs);
[`__tests__/emitter.test.mjs`](./__tests__/emitter.test.mjs) only drives the
built cases and asserts.
