---
number: 2
title: slug.mjs maxLength guard not type-narrowable under web checkJs
status: resolved
relations: {}
date: 2026-07-10
---

# slug.mjs maxLength guard not type-narrowable under web checkJs

**Status:** Resolved

**Date:** 2026-07-10
**Symptom:** `cd web && npm run check` (svelte-check, `checkJs: true`) failed with 3 errors -- `'maxLength' is possibly 'undefined'` at `src/slug/slug.mjs:69` (x2) and `:73` -- the moment `web/src/lib/slugify.ts` was rewired to re-export the shipped `src/slug/slug.mjs` instead of keeping a divergent local copy.
**Affected:** testing repo; `src/slug/slug.mjs:69,73`; surfaced via `web/src/lib/slugify.ts` (the new thin re-export) under `web/tsconfig.json` (`allowJs`+`checkJs`).
**Root cause:** The `maxLength` truncation guard read `Number.isFinite(maxLength) && maxLength >= 0`. At runtime this correctly excludes `undefined`, but TypeScript does NOT narrow a `number | undefined` (from JSDoc `@param {{ maxLength?: number }}`) through `Number.isFinite`. While the module was consumed only by its own `node --test` suite (no TS), the hole was invisible; wiring it into the web app under `checkJs` pulled the imported `.mjs` into the type-check program and exposed it.

## Investigation
1. Rewired `web/src/lib/slugify.ts` from a hand-rolled copy to `export { slugify } from '../../../src/slug/slug.mjs'` -- runtime + vitest (27) + `vite build` all green.
2. `npm run check` then failed on the canonical `.mjs`, not on any web file -- confirming svelte-check descends into imported JS under `checkJs`.
3. Considered but rejected: a web-side re-typed wrapper (hides the real gap), `@ts-nocheck` on the shared file (masks all checking), tsconfig `exclude` (does not stop import-graph inclusion under checkJs).

## Fix
Added a `typeof maxLength === "number"` conjunct to the guard so TS narrows it to `number` inside the block: `if (typeof maxLength === "number" && Number.isFinite(maxLength) && maxLength >= 0 && slug.length > maxLength)`. Behavior-identical (the typeof test is true exactly when `Number.isFinite` could be), pure type-soundness improvement. `src/slug` `node --test` still 13/13; web `check` now 0 errors.

**Commit:** pending (same PR as feat/playground-slugify)