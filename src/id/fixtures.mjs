// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the id test cases. Each datum is defined ONCE here
// and imported by the test suite — no copy-pasted literals in the test file
// (mirrors src/slug/'s and src/flags/'s fixtures discipline). All exports are
// frozen so a test can never mutate a shared fixture out from under another.

/**
 * The characters that may appear in a default `newId()`: URL-safe ASCII
 * (`A-Z`, `a-z`, `0-9`, `_`, `-`). Anchored so a single stray char fails.
 * @type {RegExp}
 */
export const DEFAULT_ALPHABET_RE = Object.freeze(/^[A-Za-z0-9_-]+$/);

/**
 * Size values that MUST throw `TypeError` when passed as an ID length: zero,
 * negative, non-integer, NaN, and non-numbers. `undefined` is deliberately
 * EXCLUDED — it is valid (it triggers the parameter default).
 * @type {ReadonlyArray<unknown>}
 */
export const INVALID_SIZES = Object.freeze([0, -1, 1.5, NaN, '5', null, {}]);

/**
 * Alphabets that MUST throw `TypeError` from `customAlphabet`: empty string, a
 * non-string, null, and a string longer than 256.
 * @type {ReadonlyArray<{ name: string, value: unknown }>}
 */
export const INVALID_ALPHABETS = Object.freeze([
  { name: 'empty string', value: '' },
  { name: 'number', value: 123 },
  { name: 'null', value: null },
  { name: 'length 257', value: 'x'.repeat(257) },
]);

/**
 * Property cases for `customAlphabet`: each generated ID must have the requested
 * length and draw only from the given alphabet. The single-char case pins an
 * EXACT expected string (`exact`) because with a one-symbol alphabet the output
 * is deterministic regardless of the RNG.
 * @type {ReadonlyArray<{ name: string, alphabet: string, size: number, exact?: string }>}
 */
export const CUSTOM_CASES = Object.freeze([
  { name: 'binary', alphabet: '01', size: 32 },
  { name: 'hex', alphabet: '0123456789abcdef', size: 16 },
  { name: 'single char (deterministic)', alphabet: 'x', size: 5, exact: 'xxxxx' },
]);
