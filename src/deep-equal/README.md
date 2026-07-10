# deep-equal

Pure, stateless, **zero-dependency** structural equality for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/duration/`](../duration/), [`src/unicode/`](../unicode/), [`src/slug/`](../slug/),
and [`src/flags/`](../flags/).

`deepEqual(a, b)` answers one question: do `a` and `b` have the same **structure**
and the same **values**, recursively? It is neither `===` (reference identity for
objects) nor `Object.is` (per-value but non-recursive) — it walks the whole shape.

## API

```js
import { deepEqual } from "./deep-equal.mjs";

deepEqual(1, 1);                                  // true
deepEqual(NaN, NaN);                              // true  (SameValueZero)
deepEqual(+0, -0);                                // true  (SameValueZero)
deepEqual(0, "0");                                // false
deepEqual({ x: 1, y: 2 }, { y: 2, x: 1 });        // true  (key order independent)
deepEqual([1, { a: 2 }], [1, { a: 2 }]);          // true
deepEqual(new Date(1000), new Date(1000));        // true
deepEqual(/x/gi, /x/ig);                          // true  (flags normalised)
deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1])); // true  (unordered)
deepEqual(new Map([["a", 1]]), new Map([["a", 2]])); // false
```

## Semantics

- **Primitives / identity — SameValueZero.** `a === b` OR both `NaN` → equal. So
  `NaN` equals `NaN` and `+0` equals `-0`; every other primitive follows `===`
  (`0 !== '0'`, `null !== undefined`, `true !== 1`).
- **Tag gate.** Objects must share `Object.prototype.toString.call(x)` to be
  comparable. This one gate separates Date / RegExp / Array / Map / Set / each
  typed-array kind / plain object, and rejects cross-type pairs (an array is
  never equal to a plain object; an `Int8Array` never equals a `Uint8Array`).
- **Date** — equal iff same `getTime()` (SameValueZero, so two Invalid Dates are
  equal).
- **RegExp** — equal iff same `source` and same `flags`.
- **Array** — same length, element-wise `deepEqual`.
- **Typed arrays** — same length, index-wise SameValueZero (same type guaranteed
  by the tag gate; `DataView` is compared as a plain object).
- **Map** — same `size`, then structural matching: every `[k, v]` in `a` must
  find a distinct unused `[k2, v2]` in `b` with both key and value deep-equal
  (greedy O(n²) — object keys are matched by value, not identity).
- **Set** — same `size`, structural membership match (same greedy approach).
- **Function** — identity only; two distinct functions are never deep-equal
  (the `===` fast path already accepted the same reference).
- **Plain objects** — own **enumerable** keys only, strings **and** enumerable
  symbols. Same key count, and every key must be own-enumerable on both sides
  with deep-equal values. Inherited and non-enumerable properties are ignored.
- **Cycle-safe.** A `seen` map (`a → b`) is threaded through the recursion, so a
  self-referential structure terminates instead of overflowing the stack — and
  still distinguishes two cycles whose shapes differ.

`deepEqual` never throws for any pair of JS values and never guesses — a
mismatched or unrecognised shape simply returns `false`.

## Test

```sh
npm test          # node --test  (built-in runner, zero deps)
```

All test inputs and expectations live once in [`fixtures.mjs`](./fixtures.mjs);
[`__tests__/deep-equal.test.mjs`](./__tests__/deep-equal.test.mjs) only asserts,
checking both directions of each case (equality is symmetric).
