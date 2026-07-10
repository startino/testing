// Thin adapter over the shipped, zero-dependency bytes library.
//
// The web app deliberately consumes the SAME formatBytes/parseBytes
// implementation the monorepo ships in src/bytes/index.mjs -- there is
// intentionally no second copy of the algorithm here. Re-exporting keeps a
// single source of truth: the IEC unit selection, strict-inverse
// canonicalization, and fail-closed behavior documented in that module is
// exactly what /playground/bytes previews.
//
// The import path escapes the SvelteKit `web/` root by design; index.mjs lives
// under the monorepo root and Vite's default workspace-root fs allowance (the
// repo's .git) covers it for both `vite dev` and `vite build` -- the same path
// the slugify adapter already relies on.
export { formatBytes, parseBytes } from '../../../src/bytes/index.mjs';
