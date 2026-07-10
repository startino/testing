# result

Pure, immutable, **zero-dependency** Result/Either type for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/deep-equal/`](../deep-equal/), [`src/duration/`](../duration/),
[`src/unicode/`](../unicode/), [`src/slug/`](../slug/), and [`src/flags/`](../flags/).

A `Result` models a computation that either **succeeded** with a value or
**failed** with an error, **without using exceptions for control flow**. It is
one of:

- `Ok`  — `{ ok: true,  value }` — success, carrying the produced value.
- `Err` — `{ ok: false, error }` — failure, carrying the error (any value).

Both variants are plain tagged objects, **frozen** (`Object.freeze`) for
immutability — you cannot mutate a Result after construction, and every
combinator returns a fresh frozen Result.

## API

```js
import {
  ok, err, isOk, isErr,
  map, mapErr, andThen,
  unwrapOr, unwrap, match, fromThrowable,
} from "./result.mjs";

ok(42);                                  // { ok: true,  value: 42 }
err("boom");                             // { ok: false, error: "boom" }

isOk(ok(1));                             // true
isErr(err(1));                           // true

map(ok(2), (x) => x + 1);                // ok(3)
map(err("e"), (x) => x + 1);             // err("e")  (fn not called)

mapErr(err("e"), (s) => s.length);       // err(1)
mapErr(ok(2), (s) => s.length);          // ok(2)     (fn not called)

andThen(ok(4), (x) => ok(x * 2));        // ok(8)
andThen(err("stop"), (x) => ok(x));      // err("stop")  (short-circuit)
andThen(ok(-1), (x) => x < 0 ? err("neg") : ok(x)); // err("neg")

unwrapOr(ok(10), 99);                    // 10
unwrapOr(err("x"), 99);                  // 99

unwrap(ok(5));                           // 5
unwrap(err(new Error("bad")));           // THROWS the contained Error

match(ok(3), { ok: (v) => `v=${v}`, err: (e) => `e=${e}` }); // "v=3"

const parse = fromThrowable(JSON.parse);
parse('{"a":1}');                        // ok({ a: 1 })
parse("nope");                           // err(SyntaxError)
```

## Semantics

- **`ok(value)` / `err(error)`** — construct the two variants. `error` can be
  any value (an `Error`, a string, a tagged object); Result does not constrain
  it. Both return a frozen object.
- **`isOk(r)` / `isErr(r)`** — pure guards over the `ok` tag (also narrow the
  type for the checker).
- **`map(r, fn)`** — transform the Ok value; an Err flows through **untouched**
  (the same reference, `fn` never called).
- **`mapErr(r, fn)`** — transform the Err value; an Ok flows through untouched.
  The mirror of `map` on the error channel.
- **`andThen(r, fn)`** — monadic chain. On an Ok, call `fn(value)` — which must
  itself return a Result — and return that. On an Err, short-circuit (`fn` not
  called). If `fn` returns a **non-Result**, that is a caller bug, so `andThen`
  throws a `TypeError` rather than wrapping a malformed value.
- **`unwrapOr(r, fallback)`** — the Ok value, or `fallback` for an Err. Total;
  never throws. `Ok(false)` returns `false`, not the fallback — the value is
  what matters, not truthiness.
- **`unwrap(r)`** — the Ok value, or **throws** the contained error verbatim for
  an Err. The one escape hatch back to exceptions; prefer `match` / `unwrapOr`
  wherever both branches can be handled.
- **`match(r, { ok, err })`** — exhaustive dispatch: calls the matching handler
  and returns its result. Both handlers are required, so no branch is forgotten.
- **`fromThrowable(fn)`** — lift a throwing **synchronous** function into a
  wrapped fn that returns `ok(result)`, or `err(thrown)` if `fn` throws (the
  thrown value carried verbatim). All args are forwarded to `fn`.

Only `unwrap` (by design) and `andThen` (on a contract violation) ever throw;
every other function is total.

## Test

```sh
npm test          # node --test  (built-in runner, zero deps)
```

All test inputs and expectations live once in [`fixtures.mjs`](./fixtures.mjs);
[`__tests__/result.test.mjs`](./__tests__/result.test.mjs) only asserts.
