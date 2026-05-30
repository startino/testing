// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the canonical Unicode test seed. Defined ONCE here
// and imported by every test — no copy-paste of the literal anywhere else.
//
// This file is authored and saved as UTF-8 so the typographic code points below
// survive byte-for-byte: curly double quotes “ U+201C / ” U+201D, curly
// apostrophe ’ U+2019, em dash — U+2014, the emoji ☕ U+2615 / 🎉 U+1F389, and
// the accented Latin letters (ü, é, ô, ï, …). None of these is an ASCII fallback.

/**
 * The canonical seed string used as the fixture across the whole test suite.
 * Contains all three in-scope Unicode categories at once:
 *   - emoji:            ☕ 🎉
 *   - smart typography: “ ” ’ —
 *   - accented Latin:   Jürgen Müller café résumé naïve Hôtel
 * @type {string}
 */
export const SEED =
  "Jürgen Müller’s café résumé: add ☕ emoji support & “smart quotes” from O’Brien’s Hôtel — fix naïve UTF-8 handling 🎉";
