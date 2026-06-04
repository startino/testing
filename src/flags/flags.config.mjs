// Checked-in feature-flag (testing sandbox) config — the local equivalent of
// "what a deploy would ship." Editing AND committing this file IS the sandbox's
// "redeploy"; there is no other deploy here. See docs/adr/0001-feature-flags-as-zero-dep-library.md
// and CONTEXT.md ("refresh model (sandbox flags)").
//
// "feature flag" here means feature flag (testing sandbox): a fail-closed
// boolean read once at process start by ./flags.mjs. It is NEVER the Station
// product feature flag (the Convex-backed, permission-gated, UI-surfaced product
// toggle described in CONTEXT.md) — that one is a different artifact and never
// lives in this file.
//
// Runtime: Node.js v24+ (ESM). Pure literal, zero runtime dependencies.

/**
 * Per-environment flag defaults, keyed by environment name.
 *
 * Shape: `{ <envName>: { <flagName>: boolean } }`. `FLAGS_ENV` (read once at
 * boot by ./flags.mjs) selects which environment's object supplies the layer-2
 * defaults. A `FLAGS_ENV` value that is not a key here resolves ALL flags to
 * `false` and never throws (fail-closed, see CONTEXT.md).
 *
 * Flag names are simple lowercase `[a-z0-9_]` identifiers so the
 * `FLAG_` + name.toUpperCase() env-override mapping is collision-free. Values
 * are LITERAL booleans; a non-boolean here is treated as not-`true` => `false`.
 *
 * @type {Readonly<Record<string, Readonly<Record<string, boolean>>>>}
 */
export const CONFIG = {
  test: {
    new_parser: true,
    verbose_logging: false,
  },
  dev: {
    new_parser: true,
    verbose_logging: true,
    experimental_cache: true,
  },
};
