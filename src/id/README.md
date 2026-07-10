# id

Pure, **zero-dependency** URL-safe collision-resistant unique ID generator for
Node v24+ (native ESM, typed via JSDoc). A `nanoid`-shaped generator with no
`nanoid` dependency — the whole algorithm is stdlib. Follows the self-contained
module shape established by [`src/slug/`](../slug/) and [`src/flags/`](../flags/)
and the conventions fixed in [`CONTEXT.md`](../../CONTEXT.md).

## API

```js
import { newId, customAlphabet } from "./id.mjs";

newId();                       // "V1StGXR8_Z5jdHi6B-myT" (21 URL-safe chars)
newId(10);                     // "IRFa-VaY2b" (10 chars)

const hex = customAlphabet("0123456789abcdef", 16);
hex();                         // "a1b2c3d4e5f60718" (16 hex chars)
hex(8);                        // "9f3c0a2e"          (explicit size overrides)
```

### `newId(size?) -> string`

Generate an ID over the default 64-symbol alphabet.

- `size` (default `21`) — number of characters, an **integer >= 1**. `undefined`
  is allowed and yields the default length.

### `customAlphabet(alphabet, defaultSize?) -> (size?) => string`

Build a generator over an arbitrary alphabet. The alphabet and `defaultSize` are
validated **eagerly**, so an invalid alphabet throws at factory-creation time,
not on first use.

- `alphabet` — a non-empty string, length `1..256`.
- `defaultSize` (default `21`) — the length used when the returned generator is
  called with no argument (integer >= 1). An explicit `size` on the call
  overrides it.

## CSPRNG source

Randomness is drawn **exclusively** through `globalThis.crypto.getRandomValues(...)`
— the WebCrypto global Node 24 ships. `Math.random` is never used (not a CSPRNG,
not uniform enough for collision resistance).

A subtlety worth pinning: in Node 24 the bare identifier `crypto` (the legacy
`node:crypto` module) is a *separate* lexical global that does **not** alias
`globalThis.crypto`. Routing every draw through `globalThis.crypto` keeps the
CSPRNG the single, stubbable source of randomness — which is exactly what the
"derives from the CSPRNG" test relies on.

## Why rejection sampling, not modulo

The default alphabet has 64 symbols:

```
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-
```

Each random byte is masked with the smallest `2^k - 1` that covers the largest
alphabet index (`mask = 63` for 64 symbols). A masked value `>= alphabet.length`
is **rejected** and another byte is read. Every retained value is equally likely
and maps 1:1 to a slot, so **every symbol has exactly equal probability** — the
distribution is uniform.

`byte % alphabet.length` would instead fold 256 byte values onto the alphabet
unevenly whenever `256` is not a multiple of the length, biasing the tail of the
alphabet toward under-representation. Rejection sampling has no such bias.

For the 64-symbol default the mask (63) covers indices `0..63` exactly, so
**nothing is ever rejected** on the default path — rejection only engages for
alphabets whose length is not a power of two.

## Argument validation

Both entry points throw `TypeError` on bad input:

| argument | rejected when |
| --- | --- |
| `size` | not an integer >= 1 (`0`, negative, `1.5`, `NaN`, `'5'`, `null`, `{}`). `undefined` is valid — it triggers the default. |
| `alphabet` | not a string, empty, or length > 256. |

## Properties

- **Zero runtime dependencies** — Node built-ins / WebCrypto global only.
- **Uniform** — unbiased bitmask rejection sampling, never modulo.
- **Collision-resistant** — 21 chars over 64 symbols is 126 bits of entropy.
- **Fail-fast** — `customAlphabet` validates its alphabet eagerly at creation.

## Test

```sh
cd src/id && npm test      # node --test (zero deps)
```

All fixture values live once in [`fixtures.mjs`](./fixtures.mjs); the suite in
[`__tests__/id.test.mjs`](./__tests__/id.test.mjs) covers length, URL-safe
alphabet, a 100k zero-collision draw, custom-alphabet property cases, argument
validation, and a `globalThis.crypto` stub proving output derives from the
CSPRNG.
