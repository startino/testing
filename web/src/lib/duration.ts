// Thin adapter over the shipped, zero-dependency duration library.
//
// The web app deliberately consumes the SAME formatDuration/parseDuration
// implementation the monorepo ships in src/duration/duration.mjs -- there is
// intentionally no second copy of the algorithm here. Re-exporting keeps a
// single source of truth: the largest-to-smallest unit decomposition, the
// strict grammar, and the fail-closed behavior documented in that module is
// exactly what /playground/duration previews.
//
// The import path escapes the SvelteKit `web/` root by design; duration.mjs
// lives under the monorepo root and Vite's default workspace-root fs allowance
// (the repo's .git) covers it for both `vite dev` and `vite build` -- the same
// path the slugify adapter already relies on.
export { formatDuration, parseDuration } from '../../../src/duration/duration.mjs';
