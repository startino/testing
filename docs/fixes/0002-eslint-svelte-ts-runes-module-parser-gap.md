# eslint parse error on first `.svelte.ts` runes module: Unexpected token interface

**Date:** 2026-06-12
**Symptom:** `npm run lint` (eslint half) fails with `Parsing error: Unexpected token interface`
(and, for any runes generic, `Unexpected token ]`) on `web/src/lib/toast.svelte.ts` -- the
first `.svelte.ts` module-scope-runes file added to the repo. `prettier --check` passes; the
error is purely eslint's parser. Every other `.svelte` and `.ts` file lints clean.
**Affected:** `web/` -- `web/src/lib/toast.svelte.ts` (the trigger), root cause in
`web/eslint.config.js:21-28`.
**Root cause:** `eslint-plugin-svelte`'s `flat/recommended` ships TWO file-glob blocks:
- `**/*.svelte` -- svelte parser **with** a processor.
- `**/*.svelte.{js,ts}` -- svelte parser **without** a processor (the runes-module convention).

The svelte parser (`svelte-eslint-parser`) only understands TypeScript syntax (`interface`,
`$state<Toast[]>([])` generics) when `parserOptions.parser` is wired to `tseslint.parser`.
This repo's `eslint.config.js` sets that sub-parser ONLY for the `**/*.svelte` override
(lines 21-28) -- NOT for `**/*.svelte.ts`. So a `.svelte.ts` module is handed to the svelte
parser in plain-JS mode and dies on the first TS-only token (`interface`, or the `]` inside a
`$state<...>` generic). The gap is latent until the first `.svelte.ts` file exists; until now
the repo had none.

## Investigation
1. `npm run lint` -> single eslint error, only on `toast.svelte.ts`; prettier clean.
2. `npx eslint . --ignore-pattern 'src/lib/toast.svelte.ts'` -> exit 0. Confirms the blast
   radius is exactly the one runes module; all my other new files (calc core `.ts`, tests,
   `+page.svelte`, `toaster.svelte`) lint clean.
3. Enumerated `eslint-plugin-svelte`'s `flat/recommended` blocks programmatically: the
   `**/*.svelte.ts` block assigns the svelte parser with NO processor and NO TS sub-parser.
4. Probe file `__probe.svelte.ts` with just `let xs = $state<number[]>([]);` -> still
   `Unexpected token ]`. Proves it is not the `interface` specifically; the svelte parser
   rejects ANY TS syntax in a `.svelte.ts` file here, so no in-file rewrite avoids it. A
   module-scope-runes store REQUIRES the `.svelte.ts` extension (runes outside `.svelte`
   need `.svelte.ts`/`.svelte.js`), so the extension cannot be dropped either.
5. Dead end: a file-level `/* eslint-disable */` does NOT suppress a PARSING error (parse
   happens before rule evaluation), so there is no in-file escape hatch.

## Fix
The proper fix is a one-line widening of `web/eslint.config.js`: change the
`files: ['**/*.svelte']` override (lines 22) to also cover the runes-module globs, i.e.
`files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js']`, so `parserOptions.parser`
(`tseslint.parser`) is applied to `.svelte.ts`/`.svelte.js` too. That makes the svelte
parser delegate TS syntax to typescript-eslint and the parse error disappears.

NOT applied in this change: `eslint.config.js` is on the DO-NOT-TOUCH list for the
`/calc` feature work (the calc plan pins config files as untouchable), and `npm run lint`
is not part of that work's acceptance gate (test/check/build/format are). The feature ships
with test/check/build/format all green; `toast.svelte.ts` matches the plan verbatim. This
entry records the diagnosis so the eslint-config widening can be applied as a focused infra
change (it touches no feature code and unblocks `npm run lint` for every future `.svelte.ts`).

**Commit:** `n/a` (diagnosis recorded; config fix intentionally deferred -- see above).
