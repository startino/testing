# src — zero-dependency utility toolbox

This directory is the zero-dependency utility toolbox of the sandbox monorepo.
Every module under `src/` is pure, dependency-free (no runtime `node_modules`
required to import it), and independently tested. The CI runner
(`scripts/test-all.mjs`) auto-discovers each module by the presence of a
`package.json` with a `"test"` script and gates the build on all of them.

## Modules

| Module | What it does | Entry |
|---|---|---|
| [bytes](./bytes/) | IEC byte-count formatter and strict-inverse parser (B/KiB/MiB/GiB/TiB/PiB, fail-closed). | `bytes/index.mjs` |
| [deep-equal](./deep-equal/) | Structural deep-equality check: SameValueZero primitives, tag-gated exotics, cycle-safe. | `deep-equal/deep-equal.mjs` |
| [duration](./duration/) | Compact duration formatter and strict-inverse parser (d/h/m/s strings, fail-closed). | `duration/duration.mjs` |
| [flags](./flags/) | Fail-closed boolean feature flags for the sandbox, resolved from config plus a boot-time env override. | `flags/flags.mjs` |
| [retry](./retry/) | Async retry with exponential backoff, full jitter, and injectable sleep/random seams (TypeScript, vitest). | `retry/retry.ts` |
| [slug](./slug/) | Unicode-aware slugify: NFKD diacritic-fold, configurable separator and max length, fail-closed. | `slug/slug.mjs` |
| [unicode](./unicode/) | Unicode-correct text processing: NFC normalisation, grapheme-aware length and slice via `Intl.Segmenter`. | `unicode/text.mjs` |

## Conventions

- **Zero runtime dependencies.** Each module imports only Node built-ins. `devDependencies`
  (TypeScript, vitest) are allowed in modules that need a build or typed test runner, but
  nothing that must be present at import time.
- **Node v24+, native ESM.** All modules declare `"type": "module"` and use `.mjs` or
  `.ts` entry points. No CommonJS, no transpilation step for the pure-JS modules.
- **Colocated tests.** Each module's tests live alongside its source and are run by the
  module's own declared runner (`node --test` for pure-JS modules, `vitest run` for the
  TypeScript module). No shared test harness.
- **One module, one concern.** Modules do not depend on each other. Each is a standalone
  leaf that can be copied or vendored independently.

## Running tests

From the repo root:

```
node scripts/test-all.mjs
```
