# Prettier crash on .svelte files: getVisitorKeys is not a function

**Date:** 2026-06-05
**Symptom:** `npm run lint` (and `npm run format`) crashed on every `.svelte` file with
`TypeError: getVisitorKeys is not a function or its return value is not iterable`,
thrown from `prettier/index.mjs` inside `printEmbeddedLanguages`. 43 files failed.
**Affected:** `web/` scaffold -- `web/package.json` (devDeps), `web/prettier.config.js`,
`web/eslint.config.js:32`.
**Root cause:** version mismatch. `prettier@3.8.3` changed the internal embedded-language
printing API (`getVisitorKeys`). `prettier-plugin-tailwindcss@0.6.14` wraps other plugins
(here `prettier-plugin-svelte`) and called the old API shape, so it blew up only when BOTH
plugins were loaded together.

## Investigation
1. Reproduced with `npm run lint` -- crash on all `.svelte` files, none on `.ts`/`.js`.
2. Checked resolved versions: `prettier@3.8.3`, `prettier-plugin-svelte@3.5.2`,
   `prettier-plugin-tailwindcss@0.6.14`.
3. Isolation test: `prettier --plugin=prettier-plugin-svelte --check <file>.svelte`
   (svelte plugin alone, no tailwind plugin) -> "All matched files use Prettier code style!".
   So the svelte plugin was fine; the tailwind plugin's wrapper was the culprit.
4. `npm view prettier-plugin-tailwindcss version` -> `0.8.0` available; `0.8.0` declares all
   companion plugins as optional peers and supports prettier 3.6+ internals.

## Fix
Bumped `prettier-plugin-tailwindcss` from `^0.6.11` to `^0.8.0` in `web/package.json`
(resolves to 0.8.0), reinstalled. Crash gone.

Two follow-on issues surfaced once prettier ran:
- A non-idempotent whitespace flip-flop in `web/src/routes/+page.svelte`: a significant
  space between an inline `<span>` and following wrapped text alternated on each format run.
  Fixed by restructuring the paragraph so the space is not the first char of a wrapped line.
- `eslint-plugin-svelte@3`'s `svelte/no-navigation-without-resolve` flagged the upstream
  shadcn `<Button>` dynamic `href` prop and external GitHub links. Disabled the rule in
  `web/eslint.config.js` (typed-routes resolve() does not fit a generic component or
  external URLs).

After all three: `npm run lint`, `npm run check` (0 errors/0 warnings), and `npm run build`
are green.

**Commit:** see same-commit scaffold of `web/`.
