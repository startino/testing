// IEC byte-count format/parse — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/duration/, src/slug/, and src/flags/.
// Rationale: the two operations this module needs — repeated integer division by
// 1024 to pick a unit, and a single anchored regex parse — are pure ECMAScript
// with no external dependency, so there is nothing to install and no build step.
// Number.toFixed handles the decimal rendering; a static RegExp encodes the
// strict grammar.
//
// Byte-string grammar produced by `formatBytes` (and the ONLY language
// `parseBytes` accepts):
//   - `<number> <UNIT>` — a number, a single ASCII space, then one IEC unit
//     token from B, KiB, MiB, GiB, TiB, PiB (base 1024).
//   - The `B` (bytes) unit is ALWAYS a plain integer — `formatBytes` never emits
//     a decimal on bytes, and `parseBytes` rejects a fractional `B` (its computed
//     byte count would not be an integer).
//   - Every other unit may carry a decimal fraction (default one place, trailing
//     zeros trimmed, so "1 KiB" not "1.0 KiB"; "1.5 KiB" keeps its tenth).
//   - PiB is the largest unit: a value in or above the PiB range is expressed in
//     PiB (no EiB is invented).
//   - A unit token is REQUIRED: a bare number with no unit ("1024") is NOT part
//     of the grammar, so `parseBytes` fails closed on it. This keeps `parseBytes`
//     a clean strict inverse of `formatBytes` (which always emits a unit).
//
// fail-closed contract: neither function throws and neither guesses.
//   - formatBytes returns null on any non-finite, negative, or non-integer
//     Number, and on any non-Number type; it also returns null for an invalid
//     `opts.decimals` (negative / non-integer / non-finite / wrong-type).
//   - parseBytes returns null on any input outside the strict grammar above
//     (empty/whitespace, unknown/missing unit, missing number, negative,
//     multiple units, non-string input, or a value whose computed byte count is
//     not an integer such as "1.5 B").
//
// Round-trip law (stated honestly): parseBytes(formatBytes(n)) === n holds for
// every `n` that `formatBytes` encodes losslessly — 0, exact unit multiples, and
// fractions that land on a representable decimal grid (e.g. 1536 -> "1.5 KiB").
// The default one-decimal render IS lossy off that grid (a value like
// 1234567 bytes rounds to "1.2 MiB", which reparses to 1258291.2 -> not an
// integer -> null), so parse(format(x)) === x is NOT promised for arbitrary x —
// only for the grid the format encodes exactly.

/** IEC units, smallest-to-largest. Index i has multiplier 1024**i. @type {ReadonlyArray<string>} */
const UNITS = Object.freeze(["B", "KiB", "MiB", "GiB", "TiB", "PiB"]);

/** Factor between adjacent IEC units. @type {number} */
const STEP = 1024;

/** Largest unit index (PiB) — values in/above this range stay in PiB. @type {number} */
const MAX_UNIT_INDEX = UNITS.length - 1;

/**
 * Default decimal places for the non-byte units. Trailing zeros are always
 * trimmed, so this is a MAX precision, not a fixed width: 1024 -> "1 KiB", not
 * "1.0 KiB"; 1536 -> "1.5 KiB". @type {number}
 */
const DEFAULT_DECIMALS = 1;

/**
 * Strict grammar of a byte string, anchored to the whole input: a non-negative
 * decimal number, a single ASCII space, then one IEC unit token.
 *
 * The ACCEPTED language is the language `formatBytes` emits. A unit token is
 * REQUIRED (no bare number), there is exactly one single space, and the number
 * has no leading `+`/`-` and no exponent. Whether the captured magnitude yields
 * an INTEGER byte count is checked in `parseBytes` after the multiply (a regex
 * cannot express "number * 1024**i is an integer"), so "1.5 B" matches here but
 * is rejected there.
 *
 * Number shape, pinned to EXACTLY what `formatBytes` emits — no superset:
 *   - integer part `0|[1-9]\d*` — no leading zeros ("01 KiB" fails), but a lone
 *     "0" is allowed (the "0 B" anchor).
 *   - optional fraction `\.\d*[1-9]` — a true fraction whose LAST digit is
 *     non-zero, because `formatBytes` trims trailing zeros ("1.50 KiB" and
 *     "1.0 KiB" both fail; "1.5 KiB" and "0.5 KiB" pass).
 *   - no leading-dot (".5 KiB") and no trailing-dot ("1. KiB") — `formatBytes`
 *     emits neither.
 *
 * Whether the captured magnitude yields an INTEGER byte count is still checked in
 * `parseBytes` after the multiply (a regex cannot express that), so "1.5 B"
 * matches here but is rejected there.
 *
 * @type {RegExp}
 */
const BYTES_RE = /^(0|[1-9]\d*)(\.\d*[1-9])? (B|KiB|MiB|GiB|TiB|PiB)$/;

/**
 * Render a number with at most `decimals` places, trimming trailing zeros (and a
 * bare trailing decimal point). So `1` stays `"1"`, `1.5` stays `"1.5"`, and
 * `1.50` collapses to `"1.5"`. Used for the non-byte units; bytes are rendered as
 * a plain integer string directly.
 *
 * @param {number} value the magnitude in the chosen unit
 * @param {number} decimals max decimal places (non-negative integer)
 * @returns {string} the trimmed decimal string
 */
function trimTrailingZeros(value, decimals) {
  const fixed = value.toFixed(decimals);
  // Only strip when a decimal point is present; "1024" (decimals 0) is untouched.
  if (fixed.indexOf(".") === -1) return fixed;
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Format a non-negative finite integer byte count into a human-readable IEC
 * string (see the grammar in the file header).
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — on any
 * non-Number, non-finite, negative, or non-integer `n`, and on an invalid
 * `opts.decimals` (negative / non-integer / non-finite / wrong-type). `-0` is
 * normalized to `0` (a valid input that formats to "0 B").
 *
 * @param {number} n non-negative finite integer byte count
 * @param {{ decimals?: number }} [opts]
 *   - `decimals` (default 1): max decimal places for non-byte units; trailing
 *     zeros are trimmed regardless, so it is a precision cap, not a fixed width.
 *     Bytes (`B`) are always integers and ignore this.
 * @returns {string|null} the IEC string, or `null` for invalid input
 */
export function formatBytes(n, opts = {}) {
  // Fail-closed guards on the byte count. Normalize -0 to +0 first so it is a
  // valid input, not a rejected value.
  if (typeof n !== "number") return null;
  if (n === 0) n = 0; // collapses -0 to +0
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;

  // Fail-closed guard on the decimals option. ONLY a truly absent `decimals`
  // (`undefined`, i.e. the key omitted) falls back to the default; any PRESENT
  // value — including `null` — must be a non-negative finite integer or we fail
  // closed. (`null` is a wrong-type value, not a "use the default" sentinel.)
  const decimals = opts.decimals === undefined ? DEFAULT_DECIMALS : opts.decimals;
  if (
    typeof decimals !== "number" ||
    !Number.isFinite(decimals) ||
    !Number.isInteger(decimals) ||
    decimals < 0
  ) {
    return null;
  }

  // Pick the largest unit whose multiplier still leaves a magnitude >= 1, capped
  // at PiB so values in/above the PiB range stay in PiB (no EiB invented).
  let unitIndex = 0;
  let value = n;
  while (value >= STEP && unitIndex < MAX_UNIT_INDEX) {
    value /= STEP;
    unitIndex += 1;
  }

  // Bytes are always an exact integer (no division happened at index 0), so they
  // render as a plain integer string with no decimal — independent of `decimals`.
  if (unitIndex === 0) return `${n} ${UNITS[0]}`;

  return `${trimTrailingZeros(value, decimals)} ${UNITS[unitIndex]}`;
}

/**
 * Parse an IEC byte string back into an integer byte count — the STRICT inverse
 * of `formatBytes` (see the grammar in the file header). Accepts a non-negative
 * number, one space, and one IEC unit token, and returns the integer byte count.
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — on any input
 * outside the grammar, including non-string input, empty/whitespace, an unknown
 * or missing unit ("1 KB", "1 foo", "KiB", "1024"), a missing number, multiple
 * units, negative values, and any string whose computed byte count is NOT an
 * integer ("1.5 B" -> 1.5 bytes -> null; "0.5 KiB" -> 512 -> 512). It is NOT a
 * lenient human-input parser.
 *
 * @param {string} str an IEC byte string in `formatBytes`'s output grammar
 * @returns {number|null} the integer byte count, or `null` for invalid input
 */
export function parseBytes(str) {
  if (typeof str !== "string") return null;

  const match = BYTES_RE.exec(str);
  if (!match) return null;

  // Groups: 1 = integer part, 2 = optional `.<frac>` (or undefined), 3 = unit.
  const [, intPart, fracPart, unit] = match;
  const unitIndex = UNITS.indexOf(unit);
  // The regex unit group can only match a known token, so indexOf never returns
  // -1 here; the guard is a defensive belt against the two drifting apart.
  if (unitIndex === -1) return null;

  const magnitude = Number(intPart + (fracPart ?? ""));
  if (!Number.isFinite(magnitude)) return null; // unreachable for matched input

  const bytes = magnitude * STEP ** unitIndex;

  // The computed byte count must be a true non-negative integer. A fractional
  // result ("1.5 B" -> 1.5, "1.5 KiB" off a clean grid) fails closed. The
  // upper-bound check also rejects a magnitude so large it lands beyond exact
  // integer representation, where integer-ness can no longer be trusted.
  if (!Number.isInteger(bytes) || bytes < 0 || !Number.isSafeInteger(bytes)) {
    return null;
  }

  return bytes;
}
