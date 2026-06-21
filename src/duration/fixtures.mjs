// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the duration format/parse test cases. Each case is
// defined ONCE here and imported by the test suite — no copy-paste of inputs or
// expectations in the test file. The tables are split by the law each one proves:
//
//   ROUND_TRIP   — ms values ON the output grid; parse(format(ms)) === ms is total
//                  here (the only place the identity holds, by design).
//   FORMAT_CASES — format-direction anchors and boundaries (0, exact unit edges,
//                  multi-unit, sub-second), each pinned to its exact string.
//   LOSSY_FORMAT — the sub-second cases where one-decimal rounding is LOSSY; these
//                  are documented format-direction behavior, never a round-trip
//                  identity claim (1 -> "0s" reparses to 0, not 1).
//   BAD_FORMAT   — inputs formatDuration must fail closed (null) on.
//   BAD_PARSE    — strings/values parseDuration must fail closed (null) on
//                  (off-grammar: no-space, overflow, fractional non-second, etc.).

/**
 * On-grid round-trip cases: `parseDuration(formatDuration(ms)) === ms` holds
 * totally for these because each `ms` lands exactly on the output grid (whole
 * d/h/m, seconds at one-decimal resolution). Includes mixed fractional-multi-unit
 * cases so the seconds-decimal-inside-multi-unit path is round-trip-locked.
 *
 * @type {ReadonlyArray<{ name: string, ms: number, str: string }>}
 */
export const ROUND_TRIP = Object.freeze([
  { name: "zero", ms: 0, str: "0s" },
  { name: "one second", ms: 1000, str: "1s" },
  { name: "one and a half seconds", ms: 1500, str: "1.5s" },
  { name: "two and a half seconds", ms: 2500, str: "2.5s" },
  { name: "half a second", ms: 500, str: "0.5s" },
  { name: "exact minute", ms: 60000, str: "1m" },
  { name: "minute and seconds", ms: 90000, str: "1m 30s" },
  { name: "minute and fractional seconds", ms: 90500, str: "1m 30.5s" },
  { name: "exact hour", ms: 3600000, str: "1h" },
  { name: "hour minute second", ms: 3661000, str: "1h 1m 1s" },
  { name: "hour minute fractional second", ms: 3661500, str: "1h 1m 1.5s" },
  { name: "exact day", ms: 86400000, str: "1d" },
  { name: "day hour minute second", ms: 90061000, str: "1d 1h 1m 1s" },
  { name: "hour and second (zero minute dropped)", ms: 3601000, str: "1h 1s" },
  { name: "max fractional second under a minute", ms: 59900, str: "59.9s" },
]);

/**
 * Format-direction anchors and boundaries: `formatDuration(ms) === str`. The
 * required spec anchors live here alongside the unit-edge and multi-unit
 * boundaries. (Every on-grid round-trip case above is also a valid format
 * anchor; this table adds the boundary coverage the round-trip set does not.)
 *
 * @type {ReadonlyArray<{ name: string, ms: number, str: string }>}
 */
export const FORMAT_CASES = Object.freeze([
  { name: "spec anchor: zero", ms: 0, str: "0s" },
  { name: "spec anchor: 1.5s", ms: 1500, str: "1.5s" },
  { name: "spec anchor: 1m 30s", ms: 90000, str: "1m 30s" },
  { name: "spec anchor: 1h 1m 1s", ms: 3661000, str: "1h 1m 1s" },
  { name: "boundary: just under a minute", ms: 59000, str: "59s" },
  { name: "boundary: just over a minute", ms: 61000, str: "1m 1s" },
  { name: "boundary: just under an hour", ms: 3599000, str: "59m 59s" },
  { name: "boundary: leading minute, no hour", ms: 119000, str: "1m 59s" },
  { name: "boundary: day with no sub-day units", ms: 172800000, str: "2d" },
  { name: "boundary: hour with seconds, zero minute dropped", ms: 3601000, str: "1h 1s" },
]);

/**
 * Lossy format-direction cases (documented). One-decimal rounding loses
 * resolution below 0.05 s, so these inputs format to a string that does NOT
 * reparse to the original ms — this is intentional, and is asserted ONLY in the
 * format direction, never as a round-trip identity.
 *
 * @type {ReadonlyArray<{ name: string, ms: number, str: string }>}
 */
export const LOSSY_FORMAT = Object.freeze([
  { name: "1ms rounds down to zero", ms: 1, str: "0s" },
  { name: "999ms rounds up to one second", ms: 999, str: "1s" },
  { name: "1250ms rounds to 1.3s", ms: 1250, str: "1.3s" },
  { name: "149ms rounds to 0.1s", ms: 149, str: "0.1s" },
  { name: "rounding carry: 899953ms (59.953s remainder) rounds up to 15m", ms: 899953, str: "15m" },
]);

/**
 * Inputs `formatDuration` must fail closed (return `null`) on — never throw.
 * `-0` is intentionally NOT here: it is normalized to `0` and formats to "0s".
 *
 * @type {ReadonlyArray<{ name: string, ms: * }>}
 */
export const BAD_FORMAT = Object.freeze([
  { name: "negative", ms: -1 },
  { name: "negative large", ms: -90000 },
  { name: "NaN", ms: NaN },
  { name: "positive infinity", ms: Infinity },
  { name: "negative infinity", ms: -Infinity },
  { name: "non-integer", ms: 1.5 },
  { name: "string number", ms: "5" },
  { name: "null", ms: null },
  { name: "undefined", ms: undefined },
  { name: "object", ms: {} },
  { name: "boolean", ms: true },
]);

/**
 * Strings (and non-strings) `parseDuration` must fail closed (return `null`) on:
 * everything outside the strict grammar `formatDuration` emits.
 *
 * @type {ReadonlyArray<{ name: string, str: * }>}
 */
export const BAD_PARSE = Object.freeze([
  { name: "no space between units", str: "1m30s" },
  { name: "overflowing seconds (would carry to a minute)", str: "90s" },
  { name: "exactly sixty seconds", str: "60s" },
  { name: "three-digit seconds", str: "100s" },
  { name: "overflowing minutes", str: "60m" },
  { name: "overflowing hours (would carry to a day)", str: "24h" },
  { name: "fractional non-second unit", str: "1.5h" },
  { name: "plural worded unit", str: "2 mins" },
  { name: "singular worded unit", str: "1 min" },
  { name: "uppercase minute", str: "1M" },
  { name: "uppercase hour", str: "1H" },
  { name: "reordered units", str: "30s 1m" },
  { name: "repeated unit", str: "1m 1m" },
  { name: "leading space", str: " 1s" },
  { name: "trailing space", str: "1s " },
  { name: "double space", str: "1m  30s" },
  { name: "two-decimal seconds", str: "1.55s" },
  { name: "trailing decimal point", str: "1.s" },
  { name: "leading decimal point", str: ".5s" },
  { name: "leading-zero seconds", str: "01s" },
  { name: "leading-zero minutes", str: "05m" },
  { name: "double-zero minutes", str: "00m" },
  { name: "leading-zero seconds in multi-unit", str: "1m 05s" },
  { name: "leading-zero minutes and seconds in multi-unit", str: "1h 09m 05s" },
  { name: "explicit .0 seconds (format trims it)", str: "1.0s" },
  { name: "explicit .0 on zero seconds", str: "0.0s" },
  { name: "explicit .0 on multi-digit seconds", str: "30.0s" },
  { name: "leading-zero plus explicit .0", str: "00.0s" },
  { name: "zero-count days", str: "0d" },
  { name: "zero-count hours", str: "0h" },
  { name: "zero-count minutes", str: "0m" },
  { name: "zero-count day beside hour", str: "0d 1h" },
  { name: "zero seconds beside a minute", str: "1m 0s" },
  { name: "zero minutes beside an hour", str: "1h 0m" },
  { name: "zero seconds beside an hour", str: "1h 0s" },
  { name: "zero seconds beside a day", str: "1d 0s" },
  { name: "zero minutes and seconds beside an hour", str: "1h 0m 0s" },
  { name: "empty string", str: "" },
  { name: "whitespace only", str: "   " },
  { name: "bare number", str: "5" },
  { name: "garbage word", str: "abc" },
  { name: "null", str: null },
  { name: "undefined", str: undefined },
  { name: "number", str: 5 },
  { name: "object", str: {} },
]);
