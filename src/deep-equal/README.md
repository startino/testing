# deep-equal

Zero-dependency structural equality for supported JavaScript data graphs on
Node.js 24+. The native ESM entry point exports one stateless function:

```js
import { deepEqual } from "./deep-equal.mjs";

deepEqual({ user: { roles: ["admin"] } }, { user: { roles: ["admin"] } }); // true
deepEqual(NaN, NaN); // true
deepEqual(new Set([{ id: 1 }, { id: 2 }]), new Set([{ id: 2 }, { id: 1 }])); // true
deepEqual(new Map([[{ id: 1 }, "ready"]]), new Map([[{ id: 1 }, "ready"]])); // true

const left = { name: "root" };
const right = { name: "root" };
left.self = left;
right.self = right;
deepEqual(left, right); // true

deepEqual(new Float64Array([NaN, 0]), new Float64Array([NaN, -0])); // true
```

## Contract

- Primitives use SameValueZero: `NaN` equals itself and signed zero compares
  equal. Symbols and functions compare only by identity.
- Ordinary objects compare the same own enumerable string and symbol keys,
  independent of key insertion order. Missing properties differ from properties
  explicitly set to `undefined`; inherited and non-enumerable properties are
  ignored. Ordinary-object prototypes must be identical, so a null-prototype
  record or an instance of a different class does not collapse to the same
  shape.
- Arrays are ordered and length-sensitive. Sparse holes differ from explicit
  `undefined`, and additional enumerable string or symbol properties are part
  of the comparison.
- Genuine Dates compare intrinsic time values, including equal invalid Dates.
  Genuine RegExps compare source, flags, `lastIndex`, and additional enumerable
  properties. A forged `Symbol.toStringTag` cannot impersonate either type.
- Maps and Sets are unordered and structurally match entries or members one to
  one. Object Map keys are compared structurally rather than by lookup identity.
- Genuine typed arrays compare only with the same concrete typed-array brand.
  Ordered elements use SameValueZero; view offsets, backing-buffer identity, and
  bytes outside the view do not matter. Additional enumerable non-index string
  and symbol properties do matter. Numeric, floating-point, and BigInt typed
  arrays are supported.
- The comparison preserves graph topology in both directions. Shared references
  must correspond to shared references, cycles must have the same shape, and a
  shared subgraph is not equal to two duplicated subgraphs.

`ArrayBuffer`, `DataView`, `Error`, `WeakMap`, `WeakSet`, promises, DOM objects,
and other unsupported exotic objects are identity-only. The same reference is
equal; two distinct instances are not. This module does not claim structural
equality for every JavaScript host value.

Enumerable accessors and proxies may execute user code or throw while their
shape is inspected. They are outside the supported-data guarantee, so
`deepEqual` does not promise purity or a never-throws boundary for those inputs.

## Complexity

Ordered structures and unambiguous objects are traversed linearly in their
reachable shape. Unordered Map and Set matching uses exhaustive backtracking so
aliases and cycles remain sound. Ambiguous collections can therefore require
combinatorial work in the worst case; correctness takes priority over a hash or
serialization shortcut that cannot represent the full graph contract.

## Test

```sh
npm test --prefix src/deep-equal
```
