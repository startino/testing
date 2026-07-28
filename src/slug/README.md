# slug

Pure, stateless, **zero-dependency** Unicode-aware slugify for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/unicode/`](../unicode/) and [`src/flags/`](../flags/) and the conventions
fixed in [`CONTEXT.md`](../../CONTEXT.md).

## API

```js
import { slugify } from "./slug.mjs";

slugify("Hello World");                       // "hello-world"
slugify("Café René");                         // "cafe-rene"   (diacritics folded)
slugify("Jürgen Müller");                     // "jurgen-muller"
slugify("  multiple   spaces & symbols!! ");  // "multiple-spaces-symbols"
slugify("");                                  // ""            (fail-closed)
slugify("Hello World", { separator: "_" });   // "hello_world"
slugify("the quick brown fox", { maxLength: 9 }); // "the-quick"
```

### `slugify(input, opts?) -> string`

Converts arbitrary text into a URL-safe ASCII slug.

| step | what it does |
| --- | --- |
| coerce | `String(input ?? "")` — null/undefined/non-string never throw |
| NFKD | compatibility-decompose so accents split off their base letter |
| strip marks | drop every combining mark (`\p{M}`) — folds diacritics to ASCII |
| lowercase | Unicode-aware `toLowerCase()` |
| tokenize | keep only `[a-z0-9]+` runs; everything else is a delimiter |
| join | tokens joined by `separator`; **no** leading/trailing/repeated separators |
| `maxLength` | optional truncation at a token boundary, never a trailing separator |

**Options**

- `separator` (default `"-"`) — string placed between tokens.
- `maxLength` — finite number `>= 0`. The slug is truncated so its length never
  exceeds it, preferring whole-token boundaries. If not even the first token
  fits, the first token is hard-cut to `maxLength`.

## Scope limitation (intentional)

The output alphabet is ASCII `[a-z0-9]`. Scripts with no Latin NFKD base form
(Cyrillic, Han, Arabic, …) carry no `[a-z0-9]` tokens and therefore slugify to
`""`. This is the URL-safe-ASCII contract — a deliberate boundary, not a bug. A
future transliterating variant could lift it, but only at the cost of the
zero-dependency guarantee.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same output.
- **Idempotent on its own output** — `slugify(slugify(x)) === slugify(x)`.
- **Fail-closed** — empty, whitespace-only, symbol-only, or non-ASCII-script
  input returns `""` and never throws.

## Test

From the **repo root**:

```sh
npm test --prefix src/slug
```

> Do **not** pass a bare directory to `node --test` (e.g.
> `node --test __tests__/`): on Node 24 that fails with `MODULE_NOT_FOUND`. Use
> bare `node --test` (auto-discovers `*.test.mjs`), an explicit glob, or an
> explicit file path.

All behavioral cases live once in [`fixtures.mjs`](./fixtures.mjs); the suite in
[`__tests__/slug.test.mjs`](./__tests__/slug.test.mjs) is table-driven plus
idempotence, non-string-input, hard-cut, and stray-separator guards.
