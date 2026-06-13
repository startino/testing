// Unicode-aware slugify — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/unicode/ and src/flags/. Rationale: the only
// operations this module needs are NFKD normalization
// (`String.prototype.normalize("NFKD")`), Unicode combining-mark removal via the
// `\p{M}` regex property (the `u` flag), and Unicode-aware lowercasing
// (`String.prototype.toLowerCase`). All three are Node 24 stdlib — zero install,
// zero build step. A diacritic-stripping slug needs no third-party transliterator
// because NFKD + mark-stripping folds accented Latin to its ASCII base
// (café -> cafe, Jürgen -> jurgen) using only built-ins.
//
// Slug shape produced by this module:
//   - lowercased (Unicode-aware)
//   - diacritics stripped (NFKD decompose, then drop combining marks)
//   - every run of non-[a-z0-9] characters becomes a SINGLE separator
//   - no leading / trailing / repeated separators (token-join guarantees this)
//   - fail-closed: empty / whitespace / all-symbol / non-ASCII-script input
//     yields "" and NEVER throws
//
// Scope limitation (documented, intentional): the output alphabet is ASCII
// [a-z0-9]. Scripts with no Latin NFKD base form (e.g. Cyrillic, Han, Arabic)
// have no [a-z0-9] tokens and therefore slugify to "". This is the URL-safe-ASCII
// contract; it is a deliberate boundary, not a bug.

/**
 * Convert arbitrary Unicode text into a URL-safe ASCII slug.
 *
 * Pure and stateless. Idempotent on its own output: slugify(slugify(x)) ===
 * slugify(x) (the result is already lowercase, diacritic-free, and separated by
 * the same separator, so a second pass is a no-op).
 *
 * Steps, in order:
 *   1. `String(input ?? "")` — guards null/undefined/non-string callers without
 *      throwing.
 *   2. `.normalize("NFKD")` — compatibility-decompose so accents split off their
 *      base letter (é -> e + U+0301).
 *   3. `.replace(/\p{M}/gu, "")` — drop every combining mark, folding diacritics.
 *   4. `.toLowerCase()` — Unicode-aware lowercasing.
 *   5. `.match(/[a-z0-9]+/g)` — keep only ASCII alphanumeric tokens; everything
 *      else (spaces, punctuation, symbols, non-Latin script) is a delimiter.
 *   6. join tokens with `separator`. No token => "" (fail-closed).
 *   7. optional `maxLength` — truncate at a token boundary, never leaving a
 *      trailing separator.
 *
 * @param {string} input arbitrary text (or any value; coerced via String)
 * @param {{ separator?: string, maxLength?: number }} [opts]
 *   - `separator` (default `"-"`): string placed between tokens.
 *   - `maxLength`: if a finite number >= 0, the slug is truncated so its length
 *     does not exceed it. Truncation prefers whole-token boundaries (no trailing
 *     separator); if not even the first token fits, the first token is hard-cut
 *     to `maxLength`.
 * @returns {string} the slug, or "" for empty/symbol-only/non-ASCII-script input
 */
export function slugify(input, opts = {}) {
  const separator = opts.separator ?? "-";
  const maxLength = opts.maxLength;

  const folded = String(input ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  const tokens = folded.match(/[a-z0-9]+/g);
  if (!tokens) return ""; // fail-closed: no alphanumeric content

  let slug = tokens.join(separator);

  if (Number.isFinite(maxLength) && maxLength >= 0 && slug.length > maxLength) {
    let out = "";
    for (const token of tokens) {
      const candidate = out ? out + separator + token : token;
      if (candidate.length > maxLength) break;
      out = candidate;
    }
    // If not even the first token fits within maxLength, hard-cut it (slicing
    // inside a single token can never produce a trailing separator).
    slug = out || tokens[0].slice(0, maxLength);
  }

  return slug;
}
