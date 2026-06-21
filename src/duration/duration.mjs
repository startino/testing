// Compact duration format/parse — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/unicode/, src/slug/, and src/flags/. Rationale:
// the two operations this module needs — integer division into d/h/m/s and a
// single anchored regex parse — are pure ECMAScript with no external dependency,
// so there is nothing to install and no build step. Number.toFixed(1) handles the
// one-decimal seconds rendering; a static RegExp encodes the strict grammar.
//
// Duration-string grammar produced by `formatDuration` (and the ONLY language
// `parseDuration` accepts):
//   - unit tokens `<int>d <int>h <int>m <num>s`, largest-to-smallest
//   - single ASCII space between tokens; at most one of each unit
//   - zero leading and zero trailing units dropped; the all-zero total is "0s"
//   - only the seconds token may carry a single decimal (one place, trailing
//     ".0" trimmed): 1500 -> "1.5s", 1000 -> "1s", 500 -> "0.5s"
//   - d/h/m are always plain integers; m and s in range 0..59 / [0,60)
//
// fail-closed contract: neither function throws and neither guesses.
//   - formatDuration returns null on non-number / non-finite / negative /
//     non-integer ms (with -0 normalized to 0, a valid input -> "0s").
//   - parseDuration returns null on any input outside the strict grammar above
//     (`1m30s`, `90s`, `1.5h`, `2 mins`, `1M`, reordered or repeated units,
//     non-string input, empty/whitespace) — it is a STRICT inverse, never a
//     lenient human-input parser.
//
// Round-trip law (stated honestly): parseDuration(formatDuration(ms)) === ms
// holds totally ONLY on the output grid — whole d/h/m and seconds at one-decimal
// resolution. The sub-second format is lossy off-grid by design (1 -> "0s",
// 999 -> "1s", 1250 -> "1.3s"), so parse(format(x)) === x is NOT promised for
// arbitrary x.

/** Milliseconds per unit, largest-to-smallest. @type {number} */
const MS_PER_DAY = 86400000;
const MS_PER_HOUR = 3600000;
const MS_PER_MINUTE = 60000;
const MS_PER_SECOND = 1000;

/**
 * Strict grammar of a duration string, anchored to the whole input. Each unit is
 * optional but at least one must be present; tokens are single-space-joined,
 * largest-to-smallest, at most one of each. Only `s` may carry one decimal digit.
 * Each unit is bounded to the range `formatDuration` can emit so overflow forms
 * carried into the next-larger unit fail to match: days unbounded (`\d+`, days
 * never carry up), hours 0..23, minutes 0..59, seconds [0,60). That is why "90s",
 * "60m", and "24h" all fail — `formatDuration` would have carried them. The
 * leading-space groups make the single-space join exact (no leading / trailing /
 * double spaces, and no token without its space).
 *
 * @type {RegExp}
 */
const DURATION_RE =
  /^(?:(\d+)d)?(?:(?:^|(?<=\d[dhm]) )(2[0-3]|1\d|\d)h)?(?:(?:^|(?<=\d[dh]) )([0-5]?\d)m)?(?:(?:^|(?<=\d[dhm]) )([0-5]?\d(?:\.\d)?)s)?$/;

/**
 * Format a non-negative finite integer millisecond count into a compact human
 * duration string (see the grammar in the file header).
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — on any non-
 * number, non-finite, negative, or non-integer `ms`. `-0` is normalized to `0`
 * (a valid input that formats to "0s"). The sub-second render is intentionally
 * lossy (one decimal, `toFixed(1)`): `1 -> "0s"`, `999 -> "1s"`, `1250 -> "1.3s"`.
 *
 * @param {number} ms non-negative finite integer milliseconds
 * @param {object} [opts] reserved for forward-compat; currently accepted and
 *   ignored — no options ship in this version
 * @returns {string|null} the duration string, or `null` for invalid `ms`
 */
export function formatDuration(ms, opts = {}) {
  void opts; // reserved, ignored (forward-compat)

  // Fail-closed guards. Normalize -0 to 0 first so it is a valid input, not a
  // rejected negative.
  if (typeof ms !== "number") return null;
  if (ms === 0) ms = 0; // collapses -0 to +0
  if (!Number.isFinite(ms) || ms < 0 || !Number.isInteger(ms)) return null;

  // Round to the display grid (nearest 100 ms = the one-decimal seconds
  // resolution) BEFORE decomposing. Decomposing first and rounding the seconds
  // last would let a value like 59953 ms round up to "60.0s" — an off-grammar
  // string with no carry into minutes. Rounding the whole quantity first keeps
  // the seconds remainder strictly below 60 and propagates the carry correctly.
  const gridMs = Math.round(ms / 100) * 100;

  const days = Math.floor(gridMs / MS_PER_DAY);
  let rest = gridMs - days * MS_PER_DAY;
  const hours = Math.floor(rest / MS_PER_HOUR);
  rest -= hours * MS_PER_HOUR;
  const minutes = Math.floor(rest / MS_PER_MINUTE);
  rest -= minutes * MS_PER_MINUTE;
  const seconds = rest / MS_PER_SECOND; // 0 <= seconds < 60, a multiple of 0.1

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  // Seconds render: one decimal, trailing ".0" trimmed. `seconds` is already on
  // the 0.1 grid, so toFixed(1) is exact (never a second rounding). Include the
  // token when it is non-zero, OR when no larger unit was emitted (so the all-
  // zero total and pure sub-second inputs both surface as a seconds token).
  const secText = seconds.toFixed(1).replace(/\.0$/, "");
  if (secText !== "0" || parts.length === 0) parts.push(`${secText}s`);

  return parts.join(" ");
}

/**
 * Parse a duration string back into milliseconds — the STRICT inverse of
 * `formatDuration` (see the grammar in the file header). Accepts ONLY the
 * language `formatDuration` emits and sums the milliseconds.
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — on any input
 * outside the grammar, including non-string input, empty/whitespace, missing
 * spaces (`1m30s`), overflowing seconds (`90s`), fractional non-second units
 * (`1.5h`), plural/worded units (`2 mins`), uppercase units (`1M`), and
 * reordered or repeated units. It is NOT a lenient human-input parser.
 *
 * @param {string} str a duration string in `formatDuration`'s output grammar
 * @returns {number|null} the summed milliseconds, or `null` for invalid input
 */
export function parseDuration(str) {
  if (typeof str !== "string") return null;

  const match = DURATION_RE.exec(str);
  if (!match) return null;

  const [, d, h, m, s] = match;
  // The regex requires at least one token, but guard the all-empty match
  // defensively (an empty string would otherwise match every optional group).
  if (d === undefined && h === undefined && m === undefined && s === undefined) {
    return null;
  }

  let ms = 0;
  if (d !== undefined) ms += Number(d) * MS_PER_DAY;
  if (h !== undefined) ms += Number(h) * MS_PER_HOUR;
  if (m !== undefined) ms += Number(m) * MS_PER_MINUTE;
  if (s !== undefined) ms += Math.round(Number(s) * MS_PER_SECOND);

  return ms;
}
