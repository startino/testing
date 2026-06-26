// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the bytes format/parse test cases. Each case is
// defined ONCE here and imported by the test suite — no copy-paste of inputs or
// expectations in the test file. The tables are split by the law each one proves:
//
//   ROUND_TRIP   — byte counts ON the lossless grid; parseBytes(formatBytes(n))
//                  === n is total here (0, exact unit multiples, clean fractions
//                  like 1536 -> "1.5 KiB"), and each is pinned to its exact string.
//   FORMAT_CASES — format-direction anchors and boundaries (the spec anchors,
//                  exact unit edges at every scale, sub-unit 512, in/above-PiB),
//                  each pinned to its exact string.
//   DECIMALS_CASES — the `decimals` option: overrides, trailing-zero trimming,
//                  and the bytes-are-always-integer rule.
//   LOSSY_FORMAT — format-direction cases where one-decimal rounding is LOSSY
//                  (e.g. 1048575 -> "1024 KiB"); documented behavior, never a
//                  round-trip identity claim.
//   BAD_FORMAT   — inputs formatBytes must fail closed (null) on.
//   BAD_DECIMALS — `opts.decimals` values formatBytes must fail closed (null) on.
//   BAD_PARSE    — strings/values parseBytes must fail closed (null) on
//                  (off-grammar: unknown/missing unit, non-canonical number,
//                  non-integer byte result, multiple units, etc.).

/** IEC unit multipliers, used to express fixture byte counts readably. */
const KiB = 1024;
const MiB = 1024 ** 2;
const GiB = 1024 ** 3;
const TiB = 1024 ** 4;
const PiB = 1024 ** 5;

/**
 * On-grid round-trip cases: `parseBytes(formatBytes(n)) === n` holds totally for
 * these because each `n` is encoded losslessly — 0, exact unit multiples at every
 * scale, the sub-unit byte cases, and clean fractions that land on a
 * representable decimal grid (1536 -> "1.5 KiB"). Each `str` is also exactly the
 * string `formatBytes` emits, so both legs are pinned. All values stay within
 * `Number.isSafeInteger` range so the byte count is exact.
 *
 * @type {ReadonlyArray<{ name: string, n: number, str: string }>}
 */
export const ROUND_TRIP = Object.freeze([
  { name: "zero bytes", n: 0, str: "0 B" },
  { name: "one byte", n: 1, str: "1 B" },
  { name: "sub-unit bytes (512)", n: 512, str: "512 B" },
  { name: "max bytes before KiB (1023)", n: 1023, str: "1023 B" },
  { name: "exact KiB", n: 1024, str: "1 KiB" },
  { name: "one and a half KiB", n: 1536, str: "1.5 KiB" },
  { name: "half a KiB (sub-unit fraction)", n: 512, str: "512 B" },
  { name: "exact MiB", n: MiB, str: "1 MiB" },
  { name: "one and a half MiB", n: 1.5 * MiB, str: "1.5 MiB" },
  { name: "exact GiB", n: GiB, str: "1 GiB" },
  { name: "one and a half GiB", n: 1.5 * GiB, str: "1.5 GiB" },
  { name: "exact TiB", n: TiB, str: "1 TiB" },
  { name: "one and a half TiB", n: 1.5 * TiB, str: "1.5 TiB" },
  { name: "exact PiB", n: PiB, str: "1 PiB" },
  { name: "one and a half PiB", n: 1.5 * PiB, str: "1.5 PiB" },
  { name: "large PiB value (7.5 PiB, still a safe integer)", n: 7.5 * PiB, str: "7.5 PiB" },
]);

/**
 * Format-direction anchors and boundaries: `formatBytes(n) === str`. The required
 * spec anchors live here alongside the unit-edge, sub-unit, and in/above-PiB
 * boundaries. (Every on-grid round-trip case above is also a valid format anchor;
 * this table adds boundary coverage the round-trip set does not.)
 *
 * @type {ReadonlyArray<{ name: string, n: number, str: string }>}
 */
export const FORMAT_CASES = Object.freeze([
  { name: "spec anchor: 0 B", n: 0, str: "0 B" },
  { name: "spec anchor: 1 KiB", n: 1024, str: "1 KiB" },
  { name: "spec anchor: 1.5 KiB", n: 1536, str: "1.5 KiB" },
  { name: "spec anchor: 1 MiB", n: 1048576, str: "1 MiB" },
  { name: "boundary: sub-unit 512 -> 512 B", n: 512, str: "512 B" },
  { name: "boundary: 1023 B stays in bytes", n: 1023, str: "1023 B" },
  { name: "boundary: exact MiB edge", n: MiB, str: "1 MiB" },
  { name: "boundary: exact GiB edge", n: GiB, str: "1 GiB" },
  { name: "boundary: exact TiB edge", n: TiB, str: "1 TiB" },
  { name: "boundary: exact PiB edge", n: PiB, str: "1 PiB" },
  { name: "in PiB range: 1.5 PiB", n: 1.5 * PiB, str: "1.5 PiB" },
  { name: "above-PiB stays PiB (2 PiB, no EiB invented)", n: 2 * PiB, str: "2 PiB" },
  { name: "default trims trailing zero (2 KiB not 2.0 KiB)", n: 2048, str: "2 KiB" },
]);

/**
 * The `decimals` option: explicit overrides, trailing-zero trimming (so
 * `decimals` is a MAX precision, not a fixed width), and the rule that bytes are
 * always integers regardless of `decimals`. `formatBytes(n, { decimals }) === str`.
 *
 * @type {ReadonlyArray<{ name: string, n: number, decimals: number, str: string }>}
 */
export const DECIMALS_CASES = Object.freeze([
  { name: "decimals 2 still trims (1.5 KiB)", n: 1536, decimals: 2, str: "1.5 KiB" },
  { name: "decimals 2 on a 1.5 GiB value", n: 1610612736, decimals: 2, str: "1.5 GiB" },
  { name: "decimals 0 rounds 1.5 GiB up to 2 GiB", n: 1610612736, decimals: 0, str: "2 GiB" },
  { name: "decimals 0 on exact KiB (1 KiB)", n: 1024, decimals: 0, str: "1 KiB" },
  { name: "high decimals still trims trailing zeros", n: 1536, decimals: 5, str: "1.5 KiB" },
  { name: "decimals ignored for bytes (always integer)", n: 512, decimals: 3, str: "512 B" },
  { name: "decimals 0 on a fractional KiB rounds (1536 -> 2 KiB)", n: 1536, decimals: 0, str: "2 KiB" },
  { name: "decimals 3 keeps more precision than default", n: 123 * MiB + 567 * KiB, decimals: 3, str: "123.554 MiB" },
]);

/**
 * Lossy format-direction cases (documented). One-decimal rounding can round a
 * magnitude up to the next whole unit-count, producing a string that does NOT
 * reparse to the original byte count — this is intentional, and is asserted ONLY
 * in the format direction, never as a round-trip identity. (`formatBytes(1048575)`
 * is `"1024 KiB"`, which reparses to 1048576, not 1048575.)
 *
 * @type {ReadonlyArray<{ name: string, n: number, str: string }>}
 */
export const LOSSY_FORMAT = Object.freeze([
  { name: "one byte under 1 MiB rounds up to 1024 KiB", n: MiB - 1, str: "1024 KiB" },
  { name: "non-grid KiB rounds to one decimal (1700 -> 1.7 KiB)", n: 1700, str: "1.7 KiB" },
  { name: "non-grid MiB rounds to one decimal", n: 1234567, str: "1.2 MiB" },
]);

/**
 * Inputs `formatBytes` must fail closed (return `null`) on — never throw.
 * `-0` is intentionally NOT here: it is normalized to `0` and formats to "0 B".
 * The non-safe-integer cases pin the symmetric ceiling: `formatBytes` rejects a
 * byte count past `Number.MAX_SAFE_INTEGER` (2**53) rather than emit a string its
 * own inverse `parseBytes` would reject — both functions share one domain.
 *
 * @type {ReadonlyArray<{ name: string, n: * }>}
 */
export const BAD_FORMAT = Object.freeze([
  { name: "negative", n: -1 },
  { name: "negative large", n: -1024 },
  { name: "NaN", n: NaN },
  { name: "positive infinity", n: Infinity },
  { name: "negative infinity", n: -Infinity },
  { name: "non-integer float", n: 1.5 },
  { name: "non-integer sub-byte", n: 0.5 },
  { name: "non-safe integer (2**53)", n: 2 ** 53 },
  { name: "non-safe integer (2**53 + 2)", n: 2 ** 53 + 2 },
  { name: "string number", n: "1024" },
  { name: "null", n: null },
  { name: "undefined", n: undefined },
  { name: "object", n: {} },
  { name: "array", n: [] },
  { name: "boolean true", n: true },
  { name: "boolean false", n: false },
  { name: "bigint", n: 1024n },
]);

/**
 * `opts.decimals` values `formatBytes` must fail closed (return `null`) on. Only
 * a truly absent `decimals` (`undefined` / omitted) uses the default; any present
 * value must be a non-negative finite integer. `null` is a wrong-type value, not
 * a "use the default" sentinel, so it fails closed.
 *
 * @type {ReadonlyArray<{ name: string, decimals: * }>}
 */
export const BAD_DECIMALS = Object.freeze([
  { name: "negative decimals", decimals: -1 },
  { name: "negative fractional decimals", decimals: -0.5 },
  { name: "non-integer decimals", decimals: 1.5 },
  { name: "NaN decimals", decimals: NaN },
  { name: "infinite decimals", decimals: Infinity },
  { name: "negative-infinite decimals", decimals: -Infinity },
  { name: "string decimals", decimals: "2" },
  { name: "null decimals (wrong type, not a default sentinel)", decimals: null },
  { name: "object decimals", decimals: {} },
  { name: "array decimals", decimals: [] },
  { name: "boolean decimals", decimals: true },
  { name: "bigint decimals", decimals: 2n },
]);

/**
 * Strings (and non-strings) `parseBytes` must fail closed (return `null`) on:
 * everything that is not the canonical default rendering `formatBytes` emits.
 * Because `parseBytes` accepts a string IFF `formatBytes(bytes) === str`, this
 * includes every NON-CANONICAL spelling of an otherwise-valid byte count — those
 * are the previously-leaking superset cases, now locked.
 *
 * @type {ReadonlyArray<{ name: string, str: * }>}
 */
export const BAD_PARSE = Object.freeze([
  { name: "unknown unit (SI KB not IEC KiB)", str: "1 KB" },
  { name: "unknown unit word", str: "1 foo" },
  { name: "unit with no number", str: "KiB" },
  { name: "number with no unit (bare count)", str: "1024" },
  { name: "fractional byte count is non-integer", str: "1.5 B" },
  { name: "empty string", str: "" },
  { name: "whitespace only", str: "   " },
  { name: "double space between number and unit", str: "1  KiB" },
  { name: "no space between number and unit", str: "1KiB" },
  { name: "leading space", str: " 1 KiB" },
  { name: "trailing space", str: "1 KiB " },
  { name: "negative number", str: "-1 KiB" },
  { name: "explicit positive sign", str: "+1 KiB" },
  { name: "multiple units", str: "1 KiB 2 MiB" },
  { name: "two numbers", str: "1 2 KiB" },
  { name: "trailing decimal point", str: "1. KiB" },
  { name: "leading decimal point", str: ".5 KiB" },
  { name: "leading-zero integer", str: "01 KiB" },
  { name: "double-zero integer", str: "00 B" },
  { name: "trailing-zero fraction (format trims it)", str: "1.50 KiB" },
  { name: "explicit .0 fraction (format trims it)", str: "1.0 KiB" },
  { name: "trailing-zero fraction on a clean value", str: "0.50 KiB" },
  { name: "exponent notation", str: "1e3 KiB" },
  { name: "lowercase unit", str: "1 kib" },
  { name: "uppercase IB unit", str: "1 KIB" },
  { name: "unit only, leading space", str: " B" },
  { name: "garbage word", str: "abc" },
  // --- non-canonical spellings of a real byte count (formerly leaked, now locked):
  // each denotes a valid count but is NOT the string formatBytes emits for it, so
  // canonicalization rejects them. The canonical form is given in each name.
  { name: "zero on a non-B unit, canonical is 0 B", str: "0 KiB" },
  { name: "zero on PiB, canonical is 0 B", str: "0 PiB" },
  { name: "sub-1 fraction KiB, canonical is 512 B", str: "0.5 KiB" },
  { name: "sub-1 fraction GiB, canonical is 256 MiB", str: "0.25 GiB" },
  { name: "magnitude >= 1024 carries: 2048 KiB, canonical is 2 MiB", str: "2048 KiB" },
  { name: "magnitude >= 1024 carries: 1536 KiB, canonical is 1.5 MiB", str: "1536 KiB" },
  { name: "magnitude >= 1024 carries: 1024 MiB, canonical is 1 GiB", str: "1024 MiB" },
  { name: "lossy format output is non-canonical: 1024 KiB parses to 1048576 (canonical 1 MiB)", str: "1024 KiB" },
  // --- domain ceiling: 8 PiB = 2**53, not a safe integer, rejected symmetrically:
  { name: "byte count at 2**53 (8 PiB) is not a safe integer", str: "8 PiB" },
  { name: "byte count above the safe-integer ceiling", str: "9 PiB" },
  // ---
  { name: "null", str: null },
  { name: "undefined", str: undefined },
  { name: "number", str: 1024 },
  { name: "object", str: {} },
  { name: "array", str: [] },
]);
