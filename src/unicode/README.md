# Unicode Text Module

Pure, stateless, dependency-free Unicode-correct text processing: emoji, smart
quotes/apostrophes, em dash, and accented Latin — all in one module.

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

## Public API (`text.mjs`)

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

## Running the tests

From the **repo root**:

```
npm test --prefix src/unicode
```

or, equivalently, run the bare auto-discovery command from any directory at or
above the tests:

```
node --test
```

> Do **not** pass a bare directory to `node --test` (e.g. `node --test src/unicode/__tests__/`):
> on Node 24 that fails with `MODULE_NOT_FOUND`. Use bare `node --test`
> (auto-discovers `*.test.mjs`), an explicit glob, or an explicit file path.
