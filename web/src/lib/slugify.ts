// Thin adapter over the shipped, zero-dependency slug library.
//
// The web app deliberately consumes the SAME slugify implementation the
// monorepo ships in src/slug/slug.mjs -- there is intentionally no second copy
// of the algorithm here. Re-exporting keeps a single source of truth: the
// unicode NFKD diacritic-folding, separator-collapsing, fail-closed behavior
// documented in that module is exactly what /playground/slugify previews.
//
// The import path escapes the SvelteKit `web/` root by design; slug.mjs lives
// at the monorepo root and Vite's default workspace-root fs allowance (the
// repo's .git) covers it for both `vite dev` and `vite build`.
export { slugify } from '../../../src/slug/slug.mjs';
