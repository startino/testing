// Thin adapter over the shipped, zero-dependency SemVer library.
//
// The web app deliberately consumes the SAME parse/compare/satisfies
// implementation the monorepo ships in src/semver/semver.mjs -- there is
// intentionally no second copy of the grammar here. Re-exporting keeps a single
// source of truth: the strict SemVer 2.0.0 regex, the SemVer 11 precedence
// walk, the caret/tilde range subset, and the fail-closed behavior documented in
// that module is exactly what /playground/semver previews.
//
// The import path escapes the SvelteKit `web/` root by design; semver.mjs lives
// under the monorepo root and Vite's default workspace-root fs allowance (the
// repo's .git) covers it for both `vite dev` and `vite build` -- the same path
// the duration and slugify adapters already rely on.
export { parse, compare, satisfies } from '../../../src/semver/semver.mjs';
