// Unicode-correct text processing — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// NOT TypeScript and NOT Python. Rationale: the only hard "no external
// dependencies" constraint that forces a runtime is grapheme-cluster
// segmentation (☕/🎉 must measure as length 1). Python 3 stdlib has NFC
// (`unicodedata.normalize`) but NO grapheme iterator — UAX-29 segmentation lives
// only in third-party packages, which would violate zero-deps. Node 24 stdlib
// provides all three operations natively: `String.prototype.normalize("NFC")`,
// `Intl.Segmenter({granularity:"grapheme"})` (ICU-backed UAX-29), and
// `String.prototype.isWellFormed()`. JSDoc gives the documented signatures the
// spec asks for with zero install and zero build step.
//
// NFC convention for this module: every function that INSPECTS or MEASURES text
// normalizes to NFC (Canonical Decomposition followed by Canonical Composition)
// FIRST, so all length/slice/round-trip results are expressed in the canonical
// form. The sole exception is `validateUtf8`, which must judge the RAW input's
// well-formedness and therefore does NOT normalize first (documented below).

/**
 * Module-level constant grapheme segmenter.
 *
 * `Intl.Segmenter` is stateless: each `.segment(s)` call returns a fresh,
 * independent iterator over `s`. Reusing one instance is a pure optimization —
 * it is an immutable constant, NOT shared mutable configuration — so the module
 * remains pure and stateless.
 *
 * @type {Intl.Segmenter}
 */
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Normalize text to Unicode NFC (Canonical Decomposition followed by Canonical
 * Composition).
 *
 * Typographic characters are PRESERVED, never collapsed to ASCII:
 *   - curly double quotes  “ U+201C   ” U+201D
 *   - curly single quotes  ‘ U+2018   ’ U+2019
 *   - em dash              — U+2014
 * No ASCII folding, no quote straightening, no whitespace collapse, no
 * transliteration. Accented Latin (e.g. é, ü, ô) stays accented.
 *
 * Pure, stateless, and idempotent by the Unicode definition of NFC:
 *   processText(processText(x)) === processText(x).
 *
 * @param {string} input arbitrary well-formed Unicode / JS string
 * @returns {string} the NFC-normalized string, typography intact
 */
export function processText(input) {
  // NFC normalize. `String(input)` guards non-string callers without throwing.
  return String(input).normalize("NFC");
}

/**
 * True iff `input` is a well-formed Unicode string — i.e. it contains no
 * unpaired UTF-16 surrogate code units and can therefore be encoded to valid
 * UTF-8 and round-tripped losslessly.
 *
 * Does NOT normalize first: validity is a property of the RAW input, so
 * normalizing beforehand would mask the question being asked. Implemented with
 * the Node 24 stdlib `String.prototype.isWellFormed()`.
 *
 * Note: any ordinary JS string literal is well-formed and returns `true`; the
 * `false` branch is reachable only via a manufactured lone surrogate such as
 * "\uD800".
 *
 * @param {string} input
 * @returns {boolean} whether `input` is a well-formed (UTF-8-encodable) string
 */
export function validateUtf8(input) {
  return String(input).isWellFormed();
}

/**
 * Grapheme-cluster (UAX-29 extended) length.
 *
 * NFC-normalizes FIRST, then counts grapheme clusters via `Intl.Segmenter` —
 * NEVER `String.length` (UTF-16 code units) and NEVER `[...s].length` (code
 * points). This makes astral emoji count as a single user-perceived character:
 *   graphemeLength("☕") === 1, graphemeLength("🎉") === 1.
 *
 * @param {string} input
 * @returns {number} number of grapheme clusters in NFC(input)
 */
export function graphemeLength(input) {
  let count = 0;
  // segment() over the NFC form; iterating yields one entry per grapheme cluster.
  for (const _segment of GRAPHEME_SEGMENTER.segment(processText(input))) count++;
  return count;
}

/**
 * Grapheme-aware slice: returns clusters in the half-open range [start, end),
 * measured in grapheme clusters — not bytes and not UTF-16 units. Because slicing
 * happens on cluster boundaries it can never bisect a surrogate pair or split a
 * base character from a combining mark.
 *
 * NFC-normalizes FIRST, then segments, then joins the selected clusters.
 *
 * Index semantics mirror `Array.prototype.slice`: negative indices count from
 * the end, `start`/`end` clamp to the cluster range, and `end` defaults to the
 * end of the string when omitted or `undefined`.
 *
 * @param {string} input
 * @param {number} [start=0] inclusive grapheme index (negative counts from end)
 * @param {number} [end] exclusive grapheme index (negative counts from end;
 *   defaults to the end of the string)
 * @returns {string} the selected grapheme clusters joined back into a string
 */
export function graphemeSlice(input, start = 0, end) {
  // Segment the NFC form into an array of grapheme-cluster strings, then defer to
  // Array.prototype.slice for the (well-specified) clamping/negative-index rules.
  const clusters = [];
  for (const { segment } of GRAPHEME_SEGMENTER.segment(processText(input))) clusters.push(segment);
  return clusters.slice(start, end).join("");
}
