// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the slugify test cases. Each case is defined ONCE
// here and imported by the test suite — no copy-paste of inputs/expectations in
// the test file. Authored and saved as UTF-8 so the accented Latin letters below
// (é, ü) survive byte-for-byte.

/**
 * Canonical behavioral cases for `slugify`. Each entry pairs an input (plus
 * optional options) with the exact expected slug and a human-readable name.
 *
 * @type {ReadonlyArray<{ name: string, input: string, opts?: object, expected: string }>}
 */
export const CASES = Object.freeze([
  { name: "basic two words", input: "Hello World", expected: "hello-world" },
  { name: "diacritics folded (cafe rene)", input: "Café René", expected: "cafe-rene" },
  { name: "diacritics folded (jurgen muller)", input: "Jürgen Müller", expected: "jurgen-muller" },
  {
    name: "collapse spaces and symbols",
    input: "  multiple   spaces & symbols!! ",
    expected: "multiple-spaces-symbols",
  },
  { name: "fail-closed: empty", input: "", expected: "" },
  { name: "fail-closed: whitespace only", input: "   ", expected: "" },
  { name: "fail-closed: symbols only", input: "!!!", expected: "" },
  {
    name: "custom separator underscore",
    input: "Hello World",
    opts: { separator: "_" },
    expected: "hello_world",
  },
  {
    name: "maxLength truncates at token boundary",
    input: "the quick brown fox",
    opts: { maxLength: 9 },
    expected: "the-quick",
  },
]);
