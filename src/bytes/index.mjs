// IEC byte-count format/parse — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/duration/, src/slug/, and src/flags/.
// Rationale: the two operations this module needs — repeated integer division by
// 1024 to pick a unit, and a parse that reverses it — are pure ECMAScript with no
// external dependency, so there is nothing to install and no build step.
// Number.toFixed handles the decimal rendering; a static RegExp screens the shape.
//
// Byte-string grammar produced by `formatBytes`:
//   - `<number> <UNIT>` — a number, a single ASCII space, then one IEC unit
//     token from B, KiB, MiB, GiB, TiB, PiB (base 1024).
//   - The `B` (bytes) unit is ALWAYS a plain integer — `formatBytes` never emits
//     a decimal on bytes.
//   - Every other unit carries a magnitude in the half-open range [1, 1024)
//     (the unit-selection loop guarantees it), rendered with the requested
//     decimals and trailing zeros trimmed, so "1 KiB" not "1.0 KiB", "1.5 KiB"
//     keeps its tenth. `0` only ever appears with `B` ("0 B").
//   - PiB is the largest unit: a value in or above the PiB range is expressed in
//     PiB (no EiB is invented).
//
// `parseBytes` is a TRUE STRICT INVERSE — it accepts a string IFF that string is
// EXACTLY what `formatBytes` (at default precision) emits for the byte count the
// string denotes. It is NOT a lenient canonical-superset parser: after a cheap
// regex screen and the integer-bytes check, it CANONICALIZES — recomputes
// `formatBytes(bytes)` and rejects unless it reproduces the input verbatim. That
// collapses the whole grammar question into "is this string canonical?" and
// structurally cannot leak a non-emitted form. Consequently every non-canonical
// spelling of the same byte count fails closed even though it is arithmetically
// meaningful: "0 KiB"/"0 PiB" (canonical "0 B"), "0.5 KiB" (canonical "512 B"),
// "0.25 GiB" (canonical "256 MiB"), "2048 KiB" (canonical "2 MiB"),
// "1024 MiB" (canonical "1 GiB"), and a bare number with no unit ("1024").
//
// fail-closed contract: neither function throws and neither guesses.
//   - formatBytes returns null on any non-finite, negative, non-integer, or
//     non-SAFE-integer Number, and on any non-Number type; it also returns null
//     for a malformed `opts` (non-object: null / number / string / array / …) and
//     for an invalid `opts.decimals` (negative / non-integer / non-finite /
//     wrong-type / above the toFixed ceiling of 100). It NEVER throws — neither a
//     `null` opts nor an out-of-range decimals reaches a `.decimals` read or a
//     `toFixed` call.
//   - parseBytes returns null on any input that is not the canonical default
//     rendering of some safe-integer byte count: empty/whitespace, unknown or
//     missing unit, missing number, negative, multiple units, non-string input, a
//     value whose computed byte count is not a SAFE integer ("1.5 B" is non-
//     integer; "8 PiB" = 2**53 is non-safe), and every non-canonical spelling.
//
// Domain (symmetric): both functions live on the SAME closed interval
// [0, Number.MAX_SAFE_INTEGER] of exact byte counts. `formatBytes` rejects a
// non-safe `n` rather than emit a string its own inverse could not trust, and
// `parseBytes` rejects a string whose byte count is non-safe.
//
// Round-trip law (stated honestly): parseBytes(formatBytes(n)) === n holds for
// every `n` that `formatBytes` encodes losslessly — 0, exact unit multiples, and
// fractions that land on a representable decimal grid (e.g. 1536 -> "1.5 KiB").
// The default one-decimal render IS lossy off that grid (1234567 bytes rounds to
// "1.2 MiB"; 1048575 rounds UP to "1024 KiB"), and those lossy strings are
// format-direction-only: parseBytes REJECTS them too, because they are not the
// canonical rendering of the byte count they parse to ("1024 KiB" parses to
// 1048576, whose canonical form is "1 MiB"). So parse(format(x)) === x is NOT
// promised for arbitrary x — only for the lossless grid the format encodes
// exactly, where format's output already IS canonical.

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
 * Upper bound for `opts.decimals`. `Number.prototype.toFixed` only accepts a
 * digits argument in [0, 100] and THROWS a RangeError outside it; we fail closed
 * at that ceiling so `formatBytes` keeps its "never throws" contract. @type {number}
 */
const MAX_DECIMALS = 100;

/**
 * Cheap structural SCREEN for a byte string, anchored to the whole input: a
 * non-negative decimal number with no leading `+`/`-` and no exponent, a single
 * ASCII space, then one IEC unit token. This is NOT the full grammar — it only
 * extracts the magnitude and unit and rejects obvious junk early. The authoritative
 * acceptance test in `parseBytes` is the CANONICALIZATION round-trip
 * (`formatBytes(bytes) === str`), which is what makes parse a true strict inverse.
 *
 * The number shape is kept canonical here too (no leading zeros via `0|[1-9]\d*`,
 * a true non-zero-terminated fraction via `\.\d*[1-9]`, no leading/trailing dot)
 * so the screen rejects the cheap non-canonical spellings without even computing
 * the byte count; the round-trip check would catch them anyway, this is just the
 * fast path. A captured magnitude that yields a non-integer byte count ("1.5 B")
 * passes the screen but is rejected by the integer check downstream.
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
 * non-Number, non-finite, negative, non-integer, or non-SAFE-integer `n`, and on
 * an invalid `opts.decimals` (negative / non-integer / non-finite / wrong-type).
 * `-0` is normalized to `0` (a valid input that formats to "0 B"). The
 * safe-integer guard keeps `formatBytes` on the SAME domain as `parseBytes`: a
 * byte count past `Number.MAX_SAFE_INTEGER` (2**53) cannot be trusted as an exact
 * integer, so rather than emit a string its own inverse would reject, it fails
 * closed.
 *
 * @param {number} n non-negative safe-integer byte count (0..Number.MAX_SAFE_INTEGER)
 * @param {{ decimals?: number }} [opts] an options object, or omitted/`undefined`.
 *   A non-object opts (`null`, a number, string, boolean, bigint, array, …) is a
 *   malformed argument and fails closed to `null` — it is NOT a "use defaults"
 *   sentinel.
 *   - `decimals` (default 1): max decimal places for non-byte units, in the range
 *     `[0, 100]` (the `toFixed` ceiling); trailing zeros are trimmed regardless,
 *     so it is a precision cap, not a fixed width. Bytes (`B`) ignore this.
 * @returns {string|null} the IEC string, or `null` for invalid input
 */
export function formatBytes(n, opts) {
  // Fail-closed guards on the byte count. Normalize -0 to +0 first so it is a
  // valid input, not a rejected value. `Number.isSafeInteger` already implies
  // finite + integer, and rejects anything past 2**53 so format and parse share
  // one domain.
  if (typeof n !== "number") return null;
  if (n === 0) n = 0; // collapses -0 to +0
  if (!Number.isSafeInteger(n) || n < 0) return null;

  // Fail-closed guard on `opts` itself. Only an OMITTED opts (`undefined`) falls
  // back to defaults; a non-object opts (`null` — which a `= {}` default param
  // would let slip through to a `.decimals` read and throw — or a number / string
  // / boolean / bigint / array) is a malformed argument, not a defaults sentinel.
  if (opts === undefined) opts = {};
  if (opts === null || typeof opts !== "object" || Array.isArray(opts)) return null;

  // Fail-closed guard on the decimals option. ONLY a truly absent `decimals`
  // (`undefined`, i.e. the key omitted) falls back to the default; any PRESENT
  // value — including `null` — must be an integer in `toFixed`'s `[0, 100]` range
  // or we fail closed. The upper bound is load-bearing: `toFixed` THROWS a
  // RangeError above 100, and "never throws" is a hard contract. (`null` is a
  // wrong-type value, not a "use the default" sentinel.)
  const decimals = opts.decimals === undefined ? DEFAULT_DECIMALS : opts.decimals;
  if (
    typeof decimals !== "number" ||
    !Number.isInteger(decimals) || // implies finite (NaN/Infinity are not integers)
    decimals < 0 ||
    decimals > MAX_DECIMALS
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
 * Parse an IEC byte string back into a byte count — the TRUE STRICT INVERSE of
 * `formatBytes`. A string is accepted IFF it is EXACTLY the default-precision
 * rendering `formatBytes` emits for the byte count it denotes; everything else
 * fails closed. This is enforced by CANONICALIZATION, not by trusting the regex:
 * after a cheap screen + integer-bytes check, it recomputes `formatBytes(bytes)`
 * and returns `null` unless that reproduces the input verbatim. That makes a
 * superset leak structurally impossible — there is no grammar to drift out of
 * sync with format's image, because format's image IS the grammar.
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — on any input
 * that is not such a canonical string: non-string input, empty/whitespace, an
 * unknown or missing unit ("1 KB", "1 foo", "KiB"), a bare number with no unit
 * ("1024"), a missing number, multiple units, negative values, a non-integer or
 * non-safe byte count ("1.5 B"; "8 PiB" = 2**53), AND every non-canonical
 * spelling of a real byte count — "0 KiB"/"0 PiB" (canonical "0 B"), "0.5 KiB"
 * (canonical "512 B"), "0.25 GiB" (canonical "256 MiB"), "2048 KiB" (canonical
 * "2 MiB"), "1024 MiB" (canonical "1 GiB"). It is NOT a lenient human-input or
 * canonical-superset parser; rejecting those forms is the contract.
 *
 * Note the round-trip law: a LOSSY format output (off the lossless grid, e.g.
 * "1024 KiB" from 1048575) is itself rejected here, because it is not the
 * canonical rendering of the count it parses to ("1024 KiB" -> 1048576, whose
 * canonical form is "1 MiB"). parse∘format = id holds only on the lossless grid.
 *
 * @param {string} str the canonical default rendering of a safe-integer byte count
 * @returns {number|null} the byte count, or `null` for any non-canonical input
 */
export function parseBytes(str) {
  if (typeof str !== "string") return null;

  // 1. Cheap structural screen — extract magnitude + unit, reject obvious junk.
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

  // 2. The byte count must be a non-negative SAFE integer. A fractional result
  // ("1.5 B" -> 1.5) or one past 2**53 ("8 PiB") cannot be an exact byte count.
  if (!Number.isSafeInteger(bytes) || bytes < 0) return null;

  // 3. CANONICALIZATION — the authoritative acceptance test. Accept IFF the input
  // is verbatim what `formatBytes` emits at default precision for this count. This
  // is what makes parse a true strict inverse: non-canonical spellings of the same
  // count ("0.5 KiB", "2048 KiB", "0 PiB", a lossy "1024 KiB") all re-render to a
  // DIFFERENT string and are rejected. Default decimals only — that is format's
  // canonical image (a higher-precision string like "1.50 KiB" is non-canonical).
  if (formatBytes(bytes) !== str) return null;

  return bytes;
}
