// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the test seed constants — defined ONCE here and
// imported by every test, with NO copy-pasted literals anywhere else (mirrors
// src/unicode/'s SEED discipline).
//
// "feature flag" here means feature flag (testing sandbox) — see CONTEXT.md and
// docs/adr/0001-feature-flags-as-zero-dep-library.md. These constants name the
// KNOWN landmarks the suite drives `isEnabled` against: the env keys and flag
// names that are present in (or deliberately absent from) the checked-in
// flags.config.mjs at the time of writing. The suite asserts only the precedence
// BEHAVIOR through these landmarks, so it stays stable as long as the config
// keeps these seed entries — it does not depend on any OTHER example flag's value.

/**
 * A `FLAGS_ENV` value that IS a key in flags.config.mjs and whose object
 * supplies the layer-2 defaults the suite probes.
 * @type {string}
 */
export const KNOWN_ENV = "test";

/**
 * A `FLAGS_ENV` value that is NOT a key in flags.config.mjs. Selecting it must
 * resolve ALL flags fail-closed `false` with no throw.
 * @type {string}
 */
export const ABSENT_ENV = "prod";

/**
 * A flag that is present in `KNOWN_ENV` with the literal value `true` — the one
 * true-path through the config-default layer.
 * @type {string}
 */
export const ENABLED_IN_KNOWN_ENV = "new_parser";

/**
 * A flag that is present in `KNOWN_ENV` with the literal value `false` — used to
 * prove a `FLAG_<NAME>` truthy override beats a config default.
 * @type {string}
 */
export const DISABLED_IN_KNOWN_ENV = "verbose_logging";

/**
 * A flag name that exists in NO environment of the config — used to prove the
 * fail-closed floor for an unknown/typo'd flag.
 * @type {string}
 */
export const UNKNOWN_FLAG = "totally_made_up_flag";

/**
 * Non-truthy / garbage `FLAG_<NAME>` values that must each parse fail-closed to
 * `false`, overriding even a `true` config default (force-off wins).
 * @type {ReadonlyArray<string>}
 */
export const GARBAGE_OVERRIDE_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "",
  "   ",
  "2",
  "maybe",
]);

/**
 * Truthy `FLAG_<NAME>` tokens (mixed case + surrounding whitespace) that must
 * each parse to `true`.
 * @type {ReadonlyArray<string>}
 */
export const TRUTHY_OVERRIDE_VALUES = Object.freeze([
  "1",
  "true",
  "TRUE",
  "on",
  "YES",
  "  true  ",
]);
