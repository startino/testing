// Collision-resistant URL-safe unique ID generator — pure, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/slug/ and src/flags/. Rationale: the only
// external capability this module needs is a cryptographically secure random
// source, and Node 24 ships WebCrypto as a global — `globalThis.crypto` — so
// there is zero install and zero build step. No `nanoid` dependency: the whole
// algorithm is ~30 lines of stdlib.
//
// Why `globalThis.crypto.getRandomValues(...)` and NOT a bare `crypto` call:
// in Node 24 the bare identifier `crypto` (the legacy `node:crypto` module) is
// a SEPARATE lexical global that does NOT alias `globalThis.crypto` (the
// WebCrypto instance). A test that stubs `globalThis.crypto` to make the RNG
// deterministic can only intercept a call that goes THROUGH `globalThis.crypto`.
// Routing every draw through `globalThis.crypto` keeps the CSPRNG the single,
// stubbable source of randomness. `Math.random` is never used (not a CSPRNG and
// not uniform enough for collision resistance).
//
// Algorithm (nanoid): unbiased rejection sampling with a BITMASK, never modulo.
//   mask = smallest (2^k - 1) that covers every alphabet index. Each random
//   byte is masked to `byte & mask`, yielding a uniformly-distributed value in
//   [0, mask]. If that value is >= alphabet.length it is REJECTED (dropped) and
//   we read another byte. Because every retained value is equally likely and
//   maps 1:1 to an alphabet slot, every symbol has EXACTLY equal probability —
//   the distribution is uniform.
//
//   Why not `byte % alphabet.length`? Modulo folds 256 byte values onto the
//   alphabet non-evenly whenever 256 is not a multiple of alphabet.length: the
//   low indices of the alphabet get one extra byte-value each, biasing the tail
//   of the alphabet toward being under-represented. Rejection sampling has no
//   such bias — it simply discards the out-of-range draws.
//
//   For the 64-symbol DEFAULT_ALPHABET the mask is 63 (0b111111), which covers
//   indices 0..63 exactly — the full alphabet — so `byte & 63` is ALWAYS in
//   range and NOTHING is ever rejected. Rejection only kicks in for alphabets
//   whose length is not a power of two.

/**
 * The default 64-symbol URL-safe alphabet: `A-Z`, `a-z`, `0-9`, `_`, `-`.
 * Exactly 64 characters, so the mask (63) covers every slot and no byte is ever
 * rejected on the default path.
 * @type {string}
 */
export const DEFAULT_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * The default ID length. 21 chars over the 64-symbol alphabet gives 126 bits of
 * entropy — the nanoid default, tuned so collision probability stays negligible
 * for practical volumes.
 * @type {number}
 */
export const DEFAULT_SIZE = 21;

/**
 * Assert a size argument is a usable length: an integer >= 1. Rejects 0,
 * negatives, non-integers (1.5), NaN, and non-numbers ('5', null, {}). Note
 * `undefined` never reaches here for the public functions because it triggers
 * the parameter default first.
 * @param {unknown} size
 * @returns {void}
 */
function assertSize(size) {
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1) {
    throw new TypeError(
      `id: size must be an integer >= 1, received ${String(size)}`,
    );
  }
}

/**
 * Assert an alphabet is a non-empty string of length 1..256. Rejects empty
 * string, non-strings, and lengths > 256 (a byte masked to at most 255 cannot
 * index past 256 symbols).
 * @param {unknown} alphabet
 * @returns {void}
 */
function assertAlphabet(alphabet) {
  if (typeof alphabet !== 'string' || alphabet.length < 1 || alphabet.length > 256) {
    throw new TypeError(
      `id: alphabet must be a non-empty string of length 1..256, received ${
        typeof alphabet === 'string' ? `string of length ${alphabet.length}` : String(alphabet)
      }`,
    );
  }
}

/**
 * Build an unbiased ID generator over `alphabet`. Validates the alphabet and
 * `defaultSize` eagerly (fail fast at factory-creation time), computes the
 * bitmask once, and returns the per-call closure. Shared by both `newId` and
 * `customAlphabet` so the core loop lives in exactly one place.
 *
 * @param {string} alphabet the symbol set to draw from (length 1..256)
 * @param {number} defaultSize the length used when the returned generator is
 *   called with no argument (integer >= 1)
 * @returns {(size?: number) => string} an ID generator
 */
function makeGenerator(alphabet, defaultSize) {
  assertAlphabet(alphabet);
  assertSize(defaultSize);

  // Smallest 2^k - 1 that covers the largest index (alphabet.length - 1).
  // e.g. length 64 -> log2(63) = 5.977, floor 5, (2 << 5) - 1 = 63.
  const mask = (2 << Math.floor(Math.log2(alphabet.length - 1))) - 1;

  return (size = defaultSize) => {
    assertSize(size);

    // `step` = how many random bytes to pull per batch. The 1.6 factor
    // over-provisions so that, even after rejections, one batch usually
    // completes the ID — an efficiency tuning constant, not a correctness one
    // (the while-loop refills as needed).
    const step = Math.ceil((1.6 * mask * size) / alphabet.length);

    let id = '';
    while (true) {
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(step));
      for (let i = 0; i < step; i++) {
        const index = bytes[i] & mask;
        // Reject out-of-range indices (only possible when alphabet.length is
        // not a power of two) to keep the distribution uniform — never modulo.
        if (index < alphabet.length) {
          id += alphabet[index];
          if (id.length === size) return id;
        }
      }
    }
  };
}

// The default generator: 64-symbol URL-safe alphabet, default length 21.
const defaultGenerator = makeGenerator(DEFAULT_ALPHABET, DEFAULT_SIZE);

/**
 * Generate a URL-safe, collision-resistant unique ID over the default 64-symbol
 * alphabet (`A-Za-z0-9_-`), drawn from the CSPRNG via unbiased rejection
 * sampling.
 *
 * @param {number} [size=DEFAULT_SIZE] number of characters (integer >= 1).
 *   `undefined` is allowed and yields the default length 21.
 * @returns {string} an ID of exactly `size` characters
 * @throws {TypeError} if `size` is not an integer >= 1
 */
export function newId(size = DEFAULT_SIZE) {
  return defaultGenerator(size);
}

/**
 * Build a generator over an arbitrary alphabet. The alphabet and `defaultSize`
 * are validated eagerly, so a bad alphabet throws HERE (at factory creation),
 * not later on first use.
 *
 * @param {string} alphabet the symbol set (non-empty string, length 1..256)
 * @param {number} [defaultSize=DEFAULT_SIZE] the length used when the returned
 *   generator is called with no argument (integer >= 1)
 * @returns {(size?: number) => string} an unbiased generator over `alphabet`
 * @throws {TypeError} if `alphabet` or `defaultSize` is invalid
 */
export function customAlphabet(alphabet, defaultSize = DEFAULT_SIZE) {
  return makeGenerator(alphabet, defaultSize);
}
