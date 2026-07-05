---
number: 1
title: TypeScript + vitest sanctioned for self-contained src/ leaf libraries
status: accepted
retired: false
supersedes: []
superseded-by: []
date: 2026-07-05
tags: [src, typescript, vitest, tooling, convention, leaf-library]
---

# TypeScript + vitest sanctioned for self-contained src/ leaf libraries

**Status:** accepted

The operator explicitly requested a "well-typed" async `retry` utility at `src/retry/` written in **TypeScript** with a **vitest** suite. This is the first TypeScript + vitest module on the `src/` module track, which until now has been uniformly `.mjs` + JSDoc + native `node --test` with zero tooling (the incumbent "proven `src/unicode/` shape" fixed by ADR 0001 and CONTEXT.md). We record here that TypeScript + vitest is a **sanctioned option** for a self-contained leaf library under `src/` when the deliverable calls for it. This is **scoped-permissive, not blanket-mandating**: it does NOT make TypeScript the `src/` default, and it does NOT deprecate or oblige migration of the existing JSDoc/`.mjs`/`node --test` siblings (`flags`, `slug`, `unicode`, and any others). The incumbent zero-tooling shape remains fully valid and the recommended default for a module that does not need a compiler or test-runner; TypeScript + vitest is the sanctioned choice when a module wants that toolchain.

## Context

ADR 0001 established the `src/` module track as self-contained, zero-dependency Node v24+ ESM modules — JSDoc-typed (deliberately *not* TypeScript), tested with native `node --test`, each owning a private `package.json` with zero tooling dependencies and no build step. That decision is narrowly about the feature-flags module mirroring the incumbent `src/unicode/` convention; its "Considered options" weigh flags substance (Convex-vs-library, hot-reload, multivariate values) and never legislate the language/runner axis as a standing cross-cutting rule. Nothing in the present decision touches `flags` or falsifies anything ADR 0001 decided, so ADR 0001 stays literally true and is **not** superseded (`supersedes: []`).

ADR 0002 is the in-repo precedent for exactly this move: when a new deliverable (`web/`) needed tooling the incumbent track lacked (TypeScript + vitest + a build + a deploy), the repo answered with a NEW ADR that superseded the old framing "for the web-app track only," explicitly **coexisting** with ADR 0001 rather than overturning it. A TypeScript + vitest leaf library under `src/` is the same shape of move, and earns the same treatment: a new, coexisting ADR — not a supersession.

The architecturally-significant thing recorded here is not "one file is TypeScript." It is the **precedent** on the repo's convention surface: a future `src/` author will cite this ADR as license to reach for TypeScript + vitest. Left unrecorded, that would silently mutate what "the proven `src/unicode/` shape" permits. Recording it — scoped-permissive — keeps ADR 0001's convention genuinely alive while forestalling both over-reads: that TypeScript is now mandatory, and that the incumbent JSDoc/`.mjs` shape is now deprecated.

**Note on ADR numbering lines.** This repo now carries two coexisting ADR numbering lines: the legacy hand-numbered `NNNN-` files (`docs/adr/0001-…`, `0002-…`) and the Convex-minted `SNNNN-` files (this document, `S0001`). They are independent sequences, so **"ADR 1"/"ADR S0001" (this doc) and "ADR 0001" (the legacy feature-flags ADR) are distinct documents** — prose in this module cites the disambiguating `S0001` form to avoid the collision.

## Considered options

- **Honor the literal request as a new coexisting track (chosen).** TypeScript delivers the "well-typed" surface the request names as a goal; vitest's fake timers are the idiomatic injectable clock the retry semantics want. Recorded as a sanctioned option, coexisting with ADR 0001. Cost: a second convention on the `src/` track, priced deliberately and bounded by the scoped-permissive framing.
- **Force the module onto the incumbent `.mjs`/JSDoc/`node --test` shape — rejected.** Overrides the operator's explicit, pre-authorized "TypeScript + vitest" words. "Well-typed" is technically satisfiable via JSDoc, but the operator chose the toolchain; this is not impl's or the architect's call to reverse.
- **Treat this as a supersession of ADR 0001 — rejected.** Supersession is for when a new decision makes an old one false. This module does not change `flags` and does not overturn any standing rule ADR 0001 established, so the supersession gate does not fire (`supersedes: []`).
- **Reuse `web/`'s vitest configuration — rejected.** `web/`'s vitest config is SvelteKit/browser-bound (`plugins: [tailwindcss(), sveltekit()]`, `resolve.conditions: ['browser']`, `happy-dom`), wrong for a headless leaf library. The module stands up its own minimal node-environment config instead.

## Consequences

- A self-contained TypeScript + vitest module under `src/` owns its OWN tooling: a private `package.json` declaring `typescript` + `vitest` as devDependencies, its own `tsconfig.json` (typecheck + vitest only, `noEmit`, no build/emit step), and its own minimal `vitest.config.ts` (node environment; no SvelteKit/Tailwind). Tooling devDependencies are **not** hoisted to the repo root; sibling modules stay byte-for-byte tooling-free.
- The module's `node_modules/` is gitignored.
- TypeScript is **not** the new `src/` default. The JSDoc/`.mjs`/`node --test` shape from ADR 0001 remains fully valid and the recommended default for a zero-tooling module. Existing siblings are untouched and under no migration obligation.
- ADR 0001 stays `accepted` and un-retired; this ADR supersedes nothing.
