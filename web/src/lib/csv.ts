// Thin adapter over the shipped, zero-dependency CSV codec.
//
// The web app deliberately consumes the SAME parse/stringify implementation the
// monorepo ships in src/csv/csv.mjs -- there is intentionally no second copy of
// the algorithm here. Re-exporting keeps a single source of truth: the RFC-4180
// grammar, minimal-quoting writer, strict round-trip, and fail-closed behavior
// documented in that module is exactly what /playground/csv previews.
//
// The import path escapes the SvelteKit `web/` root by design; csv.mjs lives
// under the monorepo root and Vite's default workspace-root fs allowance (the
// repo's .git) covers it for both `vite dev` and `vite build` -- the same path
// the slugify and bytes adapters already rely on.
export { parse, stringify } from '../../../src/csv/csv.mjs';
