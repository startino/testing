// Feature flags (testing sandbox) — pure, fail-closed, dependency-free.
//
// TERMINOLOGY GUARD (load-bearing — see CONTEXT.md): in this repo an unqualified
// "feature flag" means feature flag (testing sandbox): a fail-closed BOOLEAN read
// once at process start by this module. It is NEVER the Station product feature
// flag (the Convex-backed, permission-gated, UI-surfaced product toggle). The
// sandbox flag sets NO precedent for the product flag.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc), NOT
// TypeScript, NOT Python. Zero runtime dependencies — Node stdlib + `process.env`
// only. JSDoc gives the documented signature the spec asks for with zero install
// and zero build step. Mirrors the proven src/unicode/ convention. See
// docs/adr/0001-feature-flags-as-zero-dep-library.md for the full rationale.
//
// READ-ONCE-AT-BOOT convention: the static `import` of ./flags.config.mjs and the
// `process.env` reads below are evaluated EXACTLY ONCE, at module evaluation, into
// the immutable boot snapshot. There is NO runtime hot-reload, NO fs.watch, NO
// timers, NO polling, NO I/O after load. The refresh model is "re-run the
// process" (CONTEXT.md, "refresh model (sandbox flags)").
//
// DOCTRINE EXCEPTION: the `process.env` override layer (FLAG_<NAME>) is sanctioned
// by exactly ONE platform-doctrine carve-out — "test fixture switching modes via
// env var on fresh-process invocation" — because this repo IS that fixture. It
// introduces NO env vars beyond FLAGS_ENV and FLAG_<NAME>, and is NOT a general
// env-var behavioral toggle. See ADR 0001 and CONTEXT.md (FLAG_<NAME>).

import { CONFIG } from "./flags.config.mjs";

/**
 * Truthy-token allowlist for a `FLAG_<NAME>` override. A FLAG_<NAME> value
 * enables a flag ONLY if it matches one of these tokens (case-insensitive,
 * trimmed). Everything else — absent, empty, whitespace, "0", "false", "off",
 * "2", "maybe", any garbage — resolves the override to `false`.
 *
 * A loose `Boolean(value)` parse is a FAIL-OPEN bug (`Boolean("false") === true`)
 * and is deliberately NOT used.
 *
 * @type {ReadonlySet<string>}
 */
const TRUTHY_TOKENS = new Set(["1", "true", "on", "yes"]);

/**
 * Boot snapshot, captured ONCE at module evaluation. After this point the module
 * performs no further reads of `process.env` or the config — re-running the
 * process is the only way to pick up new values.
 *
 * `flagsEnv` is the raw `FLAGS_ENV` string (or undefined); `config` is the
 * imported static config. `env` is a frozen snapshot holding ONLY the
 * `FLAG_`-prefixed own enumerable keys of `process.env` taken at boot — the
 * override namespace this module actually reads, NOT the whole environment and
 * NOT the live `process.env` reference (least-knowledge: unrelated vars like
 * PATH or secrets never enter module scope). A `FLAG_<NAME>` override mutated
 * after module evaluation is NOT observed, and a per-flag override lookup stays a
 * single targeted read off the snapshot (no full-env scan). This makes the FLAG_
 * layer honor read-once exactly as the FLAGS_ENV layer does: the boot snapshot is
 * genuinely immutable.
 */
const BOOT = Object.freeze({
  config: CONFIG,
  flagsEnv: process.env.FLAGS_ENV,
  env: Object.freeze(
    Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith("FLAG_")),
    ),
  ),
});

/**
 * Parse a single `FLAG_<NAME>` override value fail-closed.
 *
 * @param {string|undefined} raw the raw `process.env` value (may be undefined)
 * @returns {boolean|undefined} `true`/`false` if the override is PRESENT (a
 *   present-but-non-truthy value is an explicit `false` that still wins over the
 *   config default); `undefined` if the override is ABSENT (layer does not
 *   participate — fall through to the config default).
 */
function parseOverride(raw) {
  if (raw === undefined) return undefined;
  return TRUTHY_TOKENS.has(raw.trim().toLowerCase());
}

/**
 * PRIVATE pure resolver — the only place the precedence logic lives. Pure
 * function of the boot snapshot `(config, flagsEnv, envBag)` plus the queried
 * `name`; never reads `process.env` or the config itself. Never exported.
 *
 * Highest-wins precedence (see README / ADR 0001 / CONTEXT.md):
 *   1. `FLAG_<NAME>` override (truthy-allowlist; a present non-truthy value is an
 *      explicit `false` that wins over the config default).
 *   2. `FLAGS_ENV`-selected config default (used IFF the literal value is `true`).
 *   3. fail-closed `false`.
 *
 * Total and fail-closed: an unknown flag, an unset/unknown `FLAGS_ENV`, a flag
 * absent from the selected env, or a non-`true` config value all yield `false`,
 * and nothing throws.
 *
 * @param {Record<string, Record<string, boolean>>} config the env->flags map
 * @param {string|undefined} flagsEnv the selected environment name (raw FLAGS_ENV)
 * @param {Record<string, string|undefined>} envBag the frozen boot snapshot of
 *   the `FLAG_`-prefixed `process.env` keys (for the single targeted
 *   `FLAG_<NAME>` lookup) — NOT the live global, so this stays pure over an
 *   immutable value
 * @param {string} name the queried flag name
 * @returns {boolean}
 */
function resolve(config, flagsEnv, envBag, name) {
  // Defensive total guard: a non-string / undefined / wrong-type name, or a name
  // outside the simple [a-z0-9_] identifier shape, is fail-closed `false` and
  // never throws. Anything outside the identifier shape also cannot have a valid
  // `FLAG_` + name.toUpperCase() override, so rejecting it here is total.
  if (typeof name !== "string" || !/^[a-z0-9_]+$/.test(name)) return false;

  // Layer 1 — FLAG_<NAME> override (HIGHEST). A present override is authoritative
  // either way; it does not require the flag to be pre-declared in any env.
  const override = parseOverride(envBag["FLAG_" + name.toUpperCase()]);
  if (override !== undefined) return override;

  // Layer 2 — FLAGS_ENV-selected config default (MIDDLE). An unset/unknown
  // FLAGS_ENV, a flag absent from the selected env, or a non-`true` value all
  // fall through. Strict `=== true` guards against a non-boolean config author
  // error (e.g. "yes" / 1) being coerced into enabled.
  const selected =
    flagsEnv !== undefined && Object.hasOwn(config, flagsEnv)
      ? config[flagsEnv]
      : undefined;
  if (selected !== undefined && selected[name] === true) return true;

  // Layer 3 — fail-closed FLOOR.
  return false;
}

/**
 * Resolve a single feature flag (testing sandbox) to a boolean, against the boot
 * snapshot captured at module evaluation.
 *
 * Pure from the caller's view and fail-closed: an unknown/typo'd flag, an
 * unset/unknown `FLAGS_ENV`, or a non-string `name` all return `false`, and this
 * function never throws and never reads anything new after boot.
 *
 * This is the module's EXACTLY ONE public surface — there is no `ctx` arg, no
 * second function, no multivariate / typed accessor.
 *
 * @param {string} name flag name — a simple lowercase `[a-z0-9_]` identifier
 * @returns {boolean} whether the flag is enabled for the boot-time environment
 */
export function isEnabled(name) {
  return resolve(BOOT.config, BOOT.flagsEnv, BOOT.env, name);
}
