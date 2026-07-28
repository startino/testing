# unicode

Pure, stateless, **zero-dependency** Unicode-correct text processing for Node
v24+ (native ESM, typed via JSDoc): emoji, smart quotes/apostrophes, em dash,
and accented Latin — all in one module. This is the reference module shape the
other `src/` libraries follow, per [`CONTEXT.md`](../../CONTEXT.md).

## Runtime choice

**Node.js v24+, native ESM (`.mjs`), typed via JSDoc** — not TypeScript, not
Python. The deciding constraint is *grapheme-cluster segmentation* with **zero
external dependencies**:

- Python 3 stdlib has NFC (`unicodedata.normalize`) but **no** grapheme iterator
  (UAX-29 lives only in third-party packages) → disqualified by zero-deps.
- Node 24 stdlib provides everything natively: `String.prototype.normalize("NFC")`,
  `Intl.Segmenter({ granularity: "grapheme" })` (ICU-backed UAX-29), and
  `String.prototype.isWellFormed()`.

JSDoc gives documented signatures with zero install and zero build step. The
`"type": "module"` field plus the `.mjs` extension make ESM unambiguous.

## API

```js
import { processText, validateUtf8, graphemeLength, graphemeSlice } from "./text.mjs";
```

| Function | Signature | Behavior |
|---|---|---|
| `processText` | `(input: string) => string` | NFC-normalize; preserve typography (“ ” ‘ ’ —) and accents; no ASCII folding. Idempotent. |
| `validateUtf8` | `(input: string) => boolean` | True iff well-formed (no unpaired surrogates). Does **not** normalize first. |
| `graphemeLength` | `(input: string) => number` | UAX-29 grapheme-cluster count of NFC(input). `☕` → 1, `🎉` → 1. |
| `graphemeSlice` | `(input: string, start?: number, end?: number) => string` | `Array.slice`-style half-open `[start, end)` over grapheme clusters of NFC(input). |

**NFC convention:** every function that inspects/measures text NFC-normalizes
first, so all results are expressed in canonical form. `validateUtf8` is the
sole exception — it judges the *raw* input's well-formedness.

The seed test fixture is defined **once** in `fixtures.mjs` and imported by every
test (no copy-paste).

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same output.
- **Idempotent NFC** — `processText(processText(x)) === processText(x)`.
- **Typography & accents preserved** — smart quotes/apostrophes, em dash, and
  accented Latin survive intact; there is **no** ASCII folding.
- **Grapheme-cluster correct** — measurement and slicing run over UAX-29
  clusters of NFC(input), so astral emoji count as 1 (`☕` → 1, `🎉` → 1).

## Test

From the **repo root**:

```sh
npm test --prefix src/unicode
```

> Do **not** pass a bare directory to `node --test` (e.g. `node --test src/unicode/__tests__/`):
> on Node 24 that fails with `MODULE_NOT_FOUND`. Use bare `node --test`
> (auto-discovers `*.test.mjs`), an explicit glob, or an explicit file path.
