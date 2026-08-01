// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the SemVer parse/compare/satisfies test cases. Each
// case is defined ONCE here and imported by the test suite — no copy-paste of
// inputs or expectations in the test file. The tables are split by the law each
// one proves:
//
//   VALID_PARSE        — strings `parse` must accept, pinned to every field it
//                        returns (including prerelease identifier TYPING and
//                        verbatim build identifiers). Also the round-trip set:
//                        `parse(v).version === v` for every entry.
//   INVALID_PARSE      — strings and non-strings `parse` must fail closed on.
//   PRECEDENCE_CHAIN   — the SemVer §11 example chain, strictly ascending. Drives
//                        the transitivity, sort, and pairwise-ordering proofs.
//   COMPARE_CASES      — targeted `compare` anchors (core-field ordering,
//                        prerelease-vs-release, identifier typing rules).
//   BUILD_INSENSITIVE  — pairs that differ ONLY in build metadata and must
//                        therefore compare EQUAL (§10).
//   COMPARE_NULL       — pairs where at least one side is invalid; `compare`
//                        must return null, never a guessed ordering.
//   SATISFIES_CASES    — supported-range semantics: caret at each zero-tier,
//                        tilde, exact, the boundary values immediately below and
//                        above every upper bound, and the prerelease gate in
//                        both directions.
//   UNSUPPORTED_RANGES — every range form outside the supported subset; each
//                        must return false (fail-closed, not a throw).

/**
 * Version strings `parse` must accept, with every field of the returned object
 * pinned. `prerelease` entries are typed exactly as the module returns them:
 * NUMBERS for numeric identifiers, STRINGS for alphanumeric ones. `build`
 * entries are always strings, kept verbatim (leading zeros preserved).
 *
 * Every entry here is also a round-trip case: `parse(input).version === input`.
 *
 * @type {ReadonlyArray<{
 *   name: string,
 *   input: string,
 *   major: number,
 *   minor: number,
 *   patch: number,
 *   prerelease: ReadonlyArray<string|number>,
 *   build: ReadonlyArray<string>,
 * }>}
 */
export const VALID_PARSE = Object.freeze([
  { name: "plain release", input: "1.2.3", major: 1, minor: 2, patch: 3, prerelease: [], build: [] },
  { name: "all-zero version", input: "0.0.0", major: 0, minor: 0, patch: 0, prerelease: [], build: [] },
  { name: "zero major", input: "0.1.0", major: 0, minor: 1, patch: 0, prerelease: [], build: [] },
  {
    name: "multi-digit fields",
    input: "10.20.30",
    major: 10,
    minor: 20,
    patch: 30,
    prerelease: [],
    build: [],
  },
  {
    name: "alphanumeric prerelease",
    input: "1.0.0-alpha",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: ["alpha"],
    build: [],
  },
  {
    name: "prerelease with numeric identifier",
    input: "1.0.0-alpha.1",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: ["alpha", 1],
    build: [],
  },
  {
    name: "prerelease of two alphanumeric identifiers",
    input: "1.0.0-alpha.beta",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: ["alpha", "beta"],
    build: [],
  },
  {
    name: "prerelease numeric zero identifier",
    input: "1.0.0-0",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: [0],
    build: [],
  },
  {
    name: "prerelease multi-digit numeric identifier",
    input: "1.0.0-beta.11",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: ["beta", 11],
    build: [],
  },
  {
    name: "alphanumeric identifier may START with a zero",
    input: "1.2.3-0a",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["0a"],
    build: [],
  },
  {
    name: "alphanumeric identifier of digits plus a hyphen",
    input: "1.2.3-0-1",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["0-1"],
    build: [],
  },
  {
    name: "prerelease identifier that is a bare hyphen",
    input: "1.2.3--",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["-"],
    build: [],
  },
  {
    name: "mixed prerelease identifier typing",
    input: "1.2.3-rc.1.beta.007a",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["rc", 1, "beta", "007a"],
    build: [],
  },
  {
    name: "build metadata only",
    input: "1.2.3+build.1",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    build: ["build", "1"],
  },
  {
    name: "build metadata keeps leading zeros verbatim",
    input: "1.2.3+001",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    build: ["001"],
  },
  {
    name: "build metadata with a hyphen identifier",
    input: "1.2.3+exp-sha.5114f85",
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    build: ["exp-sha", "5114f85"],
  },
  {
    name: "prerelease and build together",
    input: "1.0.0-beta.2+exp.sha.5114f85",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: ["beta", 2],
    build: ["exp", "sha", "5114f85"],
  },
  {
    name: "large-but-safe major at MAX_SAFE_INTEGER",
    input: "9007199254740991.0.0",
    major: 9007199254740991,
    minor: 0,
    patch: 0,
    prerelease: [],
    build: [],
  },
  {
    name: "large-but-safe minor and patch",
    input: "0.9007199254740991.9007199254740991",
    major: 0,
    minor: 9007199254740991,
    patch: 9007199254740991,
    prerelease: [],
    build: [],
  },
  {
    name: "large-but-safe numeric prerelease identifier",
    input: "1.0.0-9007199254740991",
    major: 1,
    minor: 0,
    patch: 0,
    prerelease: [9007199254740991],
    build: [],
  },
]);

/**
 * Inputs `parse` must fail closed (return `null`) on — never throw. Covers the
 * non-string types, the whitespace/trimming boundary, the `v`-prefix boundary,
 * arity errors, leading zeros, empty identifiers, out-of-alphabet characters,
 * and the MAX_SAFE_INTEGER precision boundary.
 *
 * @type {ReadonlyArray<{ name: string, input: * }>}
 */
export const INVALID_PARSE = Object.freeze([
  // Non-string inputs.
  { name: "null", input: null },
  { name: "undefined", input: undefined },
  { name: "number", input: 1 },
  { name: "float number", input: 1.2 },
  { name: "object", input: {} },
  { name: "version-shaped object", input: { major: 1, minor: 2, patch: 3 } },
  { name: "array", input: [1, 2, 3] },
  { name: "boolean true", input: true },
  { name: "boolean false", input: false },

  // Empty and whitespace — there is NO trimming.
  { name: "empty string", input: "" },
  { name: "whitespace only", input: "   " },
  { name: "leading space", input: " 1.2.3" },
  { name: "trailing space", input: "1.2.3 " },
  { name: "surrounding whitespace", input: " 1.2.3 " },
  { name: "internal space", input: "1.2. 3" },
  { name: "trailing newline", input: "1.2.3\n" },
  { name: "leading tab", input: "\t1.2.3" },

  // The `v`-prefix boundary (npm strips it; this module does not).
  { name: "lowercase v prefix", input: "v1.2.3" },
  { name: "uppercase V prefix", input: "V1.2.3" },
  { name: "v prefix with prerelease", input: "v1.2.3-alpha" },
  { name: "equals-v prefix", input: "=v1.2.3" },

  // Arity.
  { name: "major only", input: "1" },
  { name: "major and minor only", input: "1.2" },
  { name: "four segments", input: "1.2.3.4" },
  { name: "trailing dot", input: "1.2.3." },
  { name: "leading dot", input: ".1.2" },
  { name: "empty middle segment", input: "1..3" },
  { name: "no dots at all", input: "123" },

  // Leading zeros in core fields.
  { name: "leading-zero major", input: "01.2.3" },
  { name: "leading-zero minor", input: "1.02.3" },
  { name: "leading-zero patch", input: "1.2.03" },
  { name: "double-zero major", input: "00.1.2" },

  // Leading zeros in a NUMERIC prerelease identifier (an ALPHANUMERIC one may
  // start with a zero — see "1.2.3-0a" in VALID_PARSE).
  { name: "leading-zero numeric prerelease identifier", input: "1.2.3-01" },
  { name: "leading-zero numeric identifier mid-list", input: "1.2.3-alpha.01" },
  { name: "double-zero numeric prerelease identifier", input: "1.2.3-00" },

  // Empty prerelease / build identifiers.
  { name: "empty prerelease", input: "1.2.3-" },
  { name: "empty build", input: "1.2.3+" },
  { name: "empty prerelease identifier mid-list", input: "1.2.3-alpha..1" },
  { name: "empty build identifier mid-list", input: "1.2.3+a..b" },
  { name: "trailing dot in prerelease", input: "1.2.3-alpha." },
  { name: "trailing dot in build", input: "1.2.3+build." },
  { name: "empty prerelease before build", input: "1.2.3-+build" },

  // Characters outside `[0-9A-Za-z-]` in an identifier.
  { name: "underscore in prerelease", input: "1.2.3-alpha_1" },
  { name: "space in prerelease", input: "1.2.3-alpha 1" },
  { name: "percent in prerelease", input: "1.2.3-al%pha" },
  { name: "dollar sign in prerelease", input: "1.2.3-alpha$" },
  { name: "non-ASCII in prerelease", input: "1.2.3-alphá" },
  { name: "underscore in build", input: "1.2.3+build_1" },
  { name: "slash in build", input: "1.2.3+build/1" },
  { name: "second plus sign", input: "1.2.3+a+b" },

  // Sign and shape.
  { name: "negative major", input: "-1.2.3" },
  { name: "plus-signed major", input: "+1.2.3" },
  { name: "hex-ish major", input: "0x1.2.3" },
  { name: "exponent notation", input: "1e2.0.0" },
  { name: "x-range", input: "1.2.x" },
  { name: "wildcard", input: "*" },
  { name: "empty build after a prerelease", input: "1.2.3-alpha+" },
  { name: "doubled plus sign", input: "1.2.3++build" },
  { name: "garbage word", input: "not-a-version" },

  // Precision boundary — MAX_SAFE_INTEGER is 9007199254740991.
  { name: "major one past MAX_SAFE_INTEGER", input: "9007199254740992.0.0" },
  { name: "minor one past MAX_SAFE_INTEGER", input: "1.9007199254740992.0" },
  { name: "patch one past MAX_SAFE_INTEGER", input: "1.0.9007199254740992" },
  { name: "absurdly wide major", input: "99999999999999999999999999.0.0" },
  { name: "numeric prerelease identifier past MAX_SAFE_INTEGER", input: "1.0.0-9007199254740992" },
]);

/**
 * The SemVer 2.0.0 §11 example precedence chain, STRICTLY ASCENDING. Drives the
 * pairwise-ordering, transitivity, and sort-reproduction proofs — every earlier
 * entry must compare lower than every later one.
 *
 * @type {ReadonlyArray<string>}
 */
export const PRECEDENCE_CHAIN = Object.freeze([
  "1.0.0-alpha",
  "1.0.0-alpha.1",
  "1.0.0-alpha.beta",
  "1.0.0-beta",
  "1.0.0-beta.2",
  "1.0.0-beta.11",
  "1.0.0-rc.1",
  "1.0.0",
]);

/**
 * A shuffled permutation of `PRECEDENCE_CHAIN`, fixed here (not randomized) so
 * the sort proof is deterministic and reproducible. Sorting this with `compare`
 * must reproduce `PRECEDENCE_CHAIN` exactly.
 *
 * @type {ReadonlyArray<string>}
 */
export const SHUFFLED_CHAIN = Object.freeze([
  "1.0.0-beta.11",
  "1.0.0",
  "1.0.0-alpha.beta",
  "1.0.0-rc.1",
  "1.0.0-alpha",
  "1.0.0-beta.2",
  "1.0.0-alpha.1",
  "1.0.0-beta",
]);

/**
 * Targeted `compare` anchors beyond the chain: core-field ordering, the
 * prerelease-vs-release rule, numeric-ranks-below-alphanumeric, and the
 * longer-identifier-list rule.
 *
 * @type {ReadonlyArray<{ name: string, a: string, b: string, expected: -1|0|1 }>}
 */
export const COMPARE_CASES = Object.freeze([
  { name: "equal plain releases", a: "1.2.3", b: "1.2.3", expected: 0 },
  { name: "major dominates", a: "1.0.0", b: "2.0.0", expected: -1 },
  { name: "major dominates a larger minor", a: "1.9.9", b: "2.0.0", expected: -1 },
  { name: "minor dominates patch", a: "1.1.9", b: "1.2.0", expected: -1 },
  { name: "patch ordering", a: "1.2.3", b: "1.2.4", expected: -1 },
  { name: "numeric not lexicographic on major", a: "2.0.0", b: "10.0.0", expected: -1 },
  { name: "numeric not lexicographic on minor", a: "1.2.0", b: "1.10.0", expected: -1 },
  { name: "numeric not lexicographic on patch", a: "1.0.2", b: "1.0.10", expected: -1 },
  { name: "prerelease is lower than its release", a: "1.0.0-alpha", b: "1.0.0", expected: -1 },
  { name: "release is higher than its prerelease", a: "1.0.0", b: "1.0.0-rc.1", expected: 1 },
  { name: "prerelease still loses to a lower core", a: "1.0.1-alpha", b: "1.0.0", expected: 1 },
  { name: "equal prereleases", a: "1.0.0-alpha.1", b: "1.0.0-alpha.1", expected: 0 },
  {
    name: "numeric identifier ranks below an alphanumeric one",
    a: "1.0.0-1",
    b: "1.0.0-alpha",
    expected: -1,
  },
  {
    name: "numeric identifier ranks below an alphanumeric one starting with a digit",
    a: "1.0.0-2",
    b: "1.0.0-0a",
    expected: -1,
  },
  {
    name: "numeric identifiers compare numerically, not as text",
    a: "1.0.0-alpha.2",
    b: "1.0.0-alpha.11",
    expected: -1,
  },
  {
    name: "alphanumeric identifiers compare in ASCII order",
    a: "1.0.0-alpha",
    b: "1.0.0-beta",
    expected: -1,
  },
  {
    name: "ASCII order puts uppercase below lowercase",
    a: "1.0.0-Beta",
    b: "1.0.0-alpha",
    expected: -1,
  },
  {
    name: "longer identifier list wins when the shared prefix is equal",
    a: "1.0.0-alpha",
    b: "1.0.0-alpha.1",
    expected: -1,
  },
  {
    name: "longer identifier list wins on a numeric tail",
    a: "1.0.0-1.2",
    b: "1.0.0-1.2.3",
    expected: -1,
  },
]);

/**
 * Pairs differing ONLY in build metadata. Build metadata is excluded from
 * precedence (§10), so each pair must compare EQUAL — `compare` is an ordering
 * on precedence, not a string-identity test.
 *
 * @type {ReadonlyArray<{ name: string, a: string, b: string }>}
 */
export const BUILD_INSENSITIVE = Object.freeze([
  { name: "single-identifier build metadata", a: "1.2.3+a", b: "1.2.3+b" },
  { name: "build metadata on one side only", a: "1.2.3", b: "1.2.3+build.9" },
  { name: "differing build identifier counts", a: "1.2.3+a.b.c", b: "1.2.3+z" },
  { name: "leading-zero build identifier", a: "1.2.3+001", b: "1.2.3+1" },
  {
    name: "build metadata beside an identical prerelease",
    a: "1.0.0-beta.2+exp.sha.5114f85",
    b: "1.0.0-beta.2+other",
  },
]);

/**
 * Pairs where at least one side is unparseable. `compare` must return `null` —
 * it never guesses an ordering for a string it could not read.
 *
 * @type {ReadonlyArray<{ name: string, a: *, b: * }>}
 */
export const COMPARE_NULL = Object.freeze([
  { name: "left side invalid", a: "v1.2.3", b: "1.2.3" },
  { name: "right side invalid", a: "1.2.3", b: "1.2" },
  { name: "both sides invalid", a: "nope", b: "also-nope" },
  { name: "left side empty", a: "", b: "1.2.3" },
  { name: "right side whitespace-padded", a: "1.2.3", b: " 1.2.3" },
  { name: "left side null", a: null, b: "1.2.3" },
  { name: "right side undefined", a: "1.2.3", b: undefined },
  { name: "left side a number", a: 1, b: "1.2.3" },
  { name: "right side an object", a: "1.2.3", b: {} },
  { name: "left side leading-zero major", a: "01.2.3", b: "1.2.3" },
  { name: "right side past MAX_SAFE_INTEGER", a: "1.2.3", b: "9007199254740992.0.0" },
]);

/**
 * Supported-range semantics. Covers caret at each zero-tier, tilde, exact, the
 * boundary values immediately below and immediately above every upper bound, and
 * the prerelease gate in both directions.
 *
 * @type {ReadonlyArray<{ name: string, version: string, range: string, expected: boolean }>}
 */
export const SATISFIES_CASES = Object.freeze([
  // Exact ranges.
  { name: "exact: identical", version: "1.2.3", range: "1.2.3", expected: true },
  { name: "exact: higher patch", version: "1.2.4", range: "1.2.3", expected: false },
  { name: "exact: lower patch", version: "1.2.2", range: "1.2.3", expected: false },
  {
    name: "exact: build metadata on the version is ignored",
    version: "1.2.3+build.9",
    range: "1.2.3",
    expected: true,
  },
  {
    name: "exact: build metadata on the range is ignored",
    version: "1.2.3",
    range: "1.2.3+build.9",
    expected: true,
  },
  {
    name: "exact: identical prerelease",
    version: "1.2.3-alpha.1",
    range: "1.2.3-alpha.1",
    expected: true,
  },
  {
    name: "exact: differing prerelease",
    version: "1.2.3-alpha.2",
    range: "1.2.3-alpha.1",
    expected: false,
  },
  {
    name: "exact: prerelease against a release range",
    version: "1.2.3-alpha.1",
    range: "1.2.3",
    expected: false,
  },

  // Caret, major > 0: ^1.2.3 -> >=1.2.3 <2.0.0
  { name: "caret major>0: at the lower bound", version: "1.2.3", range: "^1.2.3", expected: true },
  { name: "caret major>0: just below the lower bound", version: "1.2.2", range: "^1.2.3", expected: false },
  { name: "caret major>0: higher patch", version: "1.2.4", range: "^1.2.3", expected: true },
  { name: "caret major>0: higher minor", version: "1.9.0", range: "^1.2.3", expected: true },
  { name: "caret major>0: lower minor", version: "1.1.9", range: "^1.2.3", expected: false },
  {
    name: "caret major>0: just below the upper bound",
    version: "1.999.999",
    range: "^1.2.3",
    expected: true,
  },
  { name: "caret major>0: at the exclusive upper bound", version: "2.0.0", range: "^1.2.3", expected: false },
  { name: "caret major>0: above the upper bound", version: "2.0.1", range: "^1.2.3", expected: false },
  {
    name: "caret major>0: prerelease of the next major is excluded by the bound",
    version: "2.0.0-alpha",
    range: "^1.2.3",
    expected: false,
  },

  // Caret, major 0 / minor > 0: ^0.2.3 -> >=0.2.3 <0.3.0
  { name: "caret 0.x: at the lower bound", version: "0.2.3", range: "^0.2.3", expected: true },
  { name: "caret 0.x: just below the lower bound", version: "0.2.2", range: "^0.2.3", expected: false },
  { name: "caret 0.x: higher patch", version: "0.2.9", range: "^0.2.3", expected: true },
  {
    name: "caret 0.x: just below the upper bound",
    version: "0.2.999",
    range: "^0.2.3",
    expected: true,
  },
  { name: "caret 0.x: at the exclusive upper bound", version: "0.3.0", range: "^0.2.3", expected: false },
  { name: "caret 0.x: higher minor is out", version: "0.3.1", range: "^0.2.3", expected: false },
  { name: "caret 0.x: next major is out", version: "1.0.0", range: "^0.2.3", expected: false },

  // Caret, major 0 and minor 0: ^0.0.3 -> >=0.0.3 <0.0.4
  { name: "caret 0.0.x: at the lower bound", version: "0.0.3", range: "^0.0.3", expected: true },
  { name: "caret 0.0.x: just below the lower bound", version: "0.0.2", range: "^0.0.3", expected: false },
  { name: "caret 0.0.x: at the exclusive upper bound", version: "0.0.4", range: "^0.0.3", expected: false },
  { name: "caret 0.0.x: higher minor is out", version: "0.1.0", range: "^0.0.3", expected: false },
  { name: "caret 0.0.0 pins the single patch", version: "0.0.0", range: "^0.0.0", expected: true },
  { name: "caret 0.0.0 excludes 0.0.1", version: "0.0.1", range: "^0.0.0", expected: false },

  // Tilde: ~1.2.3 -> >=1.2.3 <1.3.0
  { name: "tilde: at the lower bound", version: "1.2.3", range: "~1.2.3", expected: true },
  { name: "tilde: just below the lower bound", version: "1.2.2", range: "~1.2.3", expected: false },
  { name: "tilde: higher patch", version: "1.2.99", range: "~1.2.3", expected: true },
  { name: "tilde: at the exclusive upper bound", version: "1.3.0", range: "~1.2.3", expected: false },
  { name: "tilde: higher minor is out", version: "1.3.1", range: "~1.2.3", expected: false },
  { name: "tilde: next major is out", version: "2.0.0", range: "~1.2.3", expected: false },
  { name: "tilde 0.0.x: at the lower bound", version: "0.0.3", range: "~0.0.3", expected: true },
  {
    name: "tilde 0.0.x fixes minor, unlike caret: 0.0.4 is IN",
    version: "0.0.4",
    range: "~0.0.3",
    expected: true,
  },
  { name: "tilde 0.0.x: at the exclusive upper bound", version: "0.1.0", range: "~0.0.3", expected: false },
  { name: "tilde 0.2.x: higher patch is in", version: "0.2.9", range: "~0.2.3", expected: true },
  { name: "tilde 0.2.x: at the exclusive upper bound", version: "0.3.0", range: "~0.2.3", expected: false },

  // Prerelease gate — both directions.
  {
    name: "gate: same core, later prerelease is IN a caret prerelease range",
    version: "1.2.3-alpha.2",
    range: "^1.2.3-alpha.1",
    expected: true,
  },
  {
    name: "gate: same core, identical prerelease is IN",
    version: "1.2.3-alpha.1",
    range: "^1.2.3-alpha.1",
    expected: true,
  },
  {
    name: "gate: same core, earlier prerelease is below the lower bound",
    version: "1.2.3-alpha.0",
    range: "^1.2.3-alpha.1",
    expected: false,
  },
  {
    name: "gate: different core prerelease is OUT even inside the numeric span",
    version: "1.2.4-alpha.1",
    range: "^1.2.3-alpha.1",
    expected: false,
  },
  {
    name: "gate: prerelease is OUT of a release-only caret range",
    version: "1.2.4-alpha",
    range: "^1.2.3",
    expected: false,
  },
  {
    name: "gate: prerelease is OUT of a release-only tilde range",
    version: "1.2.4-alpha",
    range: "~1.2.3",
    expected: false,
  },
  {
    name: "gate: prerelease is OUT of a release-only exact range",
    version: "1.2.3-alpha",
    range: "1.2.3",
    expected: false,
  },
  {
    name: "gate: same core prerelease is IN a tilde prerelease range",
    version: "1.2.3-beta",
    range: "~1.2.3-alpha",
    expected: true,
  },
  {
    name: "gate: a RELEASE still satisfies a prerelease-anchored range",
    version: "1.2.3",
    range: "^1.2.3-alpha.1",
    expected: true,
  },
  {
    name: "gate: a later release still satisfies a prerelease-anchored range",
    version: "1.5.0",
    range: "^1.2.3-alpha.1",
    expected: true,
  },
  {
    name: "gate: the upper bound still excludes the next major",
    version: "2.0.0",
    range: "^1.2.3-alpha.1",
    expected: false,
  },
]);

/**
 * Range forms outside the supported subset, plus non-string and unparseable
 * inputs. Every one must return `false` — `satisfies` is fail-closed with no
 * third state, so an unreadable range is answered "no", never `null` and never
 * a throw. The `version` on each case is deliberately VALID so the false can
 * only come from the range.
 *
 * @type {ReadonlyArray<{ name: string, version: *, range: * }>}
 */
export const UNSUPPORTED_RANGES = Object.freeze([
  // Comparator ranges.
  { name: "greater-or-equal comparator", version: "1.2.3", range: ">=1.2.3" },
  { name: "greater-than comparator", version: "1.2.4", range: ">1.2.3" },
  { name: "less-than comparator", version: "1.2.2", range: "<1.2.3" },
  { name: "less-or-equal comparator", version: "1.2.3", range: "<=1.2.3" },
  { name: "equals comparator", version: "1.2.3", range: "=1.2.3" },
  { name: "two-comparator range", version: "1.2.3", range: ">=1.2.3 <2.0.0" },

  // X-ranges and wildcards.
  { name: "patch x-range", version: "1.2.3", range: "1.2.x" },
  { name: "minor x-range", version: "1.2.3", range: "1.x" },
  { name: "uppercase x-range", version: "1.2.3", range: "1.2.X" },
  { name: "star wildcard", version: "1.2.3", range: "*" },
  { name: "empty range", version: "1.2.3", range: "" },
  { name: "star patch in a caret", version: "1.2.3", range: "^1.2.*" },

  // Hyphen ranges and unions.
  { name: "hyphen range", version: "1.5.0", range: "1.2.3 - 2.0.0" },
  { name: "union of two ranges", version: "1.2.3", range: "^1.2.3 || ^2.0.0" },

  // Partial carets/tildes — the base must be a FULL version.
  { name: "caret with major and minor only", version: "1.2.3", range: "^1.2" },
  { name: "caret with major only", version: "1.2.3", range: "^1" },
  { name: "tilde with major and minor only", version: "1.2.3", range: "~1.2" },
  { name: "tilde with major only", version: "1.2.3", range: "~1" },
  { name: "bare caret", version: "1.2.3", range: "^" },
  { name: "bare tilde", version: "1.2.3", range: "~" },
  { name: "doubled caret", version: "1.2.3", range: "^^1.2.3" },

  // Whitespace padding — there is NO trimming.
  { name: "leading space", version: "1.2.3", range: " 1.2.3" },
  { name: "trailing space", version: "1.2.3", range: "1.2.3 " },
  { name: "space after the caret", version: "1.2.3", range: "^ 1.2.3" },
  { name: "whitespace-only range", version: "1.2.3", range: "   " },

  // The `v` prefix, rejected in ranges exactly as in versions.
  { name: "v-prefixed exact range", version: "1.2.3", range: "v1.2.3" },
  { name: "v-prefixed caret range", version: "1.2.3", range: "^v1.2.3" },

  // Invalid range bases.
  { name: "leading-zero range base", version: "1.2.3", range: "^01.2.3" },
  { name: "range base past MAX_SAFE_INTEGER", version: "1.2.3", range: "^9007199254740992.0.0" },
  { name: "garbage range", version: "1.2.3", range: "latest" },

  // Non-string ranges.
  { name: "null range", version: "1.2.3", range: null },
  { name: "undefined range", version: "1.2.3", range: undefined },
  { name: "number range", version: "1.2.3", range: 1 },
  { name: "object range", version: "1.2.3", range: {} },
  { name: "array range", version: "1.2.3", range: ["1.2.3"] },
  { name: "boolean range", version: "1.2.3", range: true },
]);

/**
 * Invalid VERSION inputs paired with a valid supported range. `satisfies` must
 * return `false` for each — the version side is fail-closed too.
 *
 * @type {ReadonlyArray<{ name: string, version: *, range: string }>}
 */
export const UNSATISFIABLE_VERSIONS = Object.freeze([
  { name: "v-prefixed version", version: "v1.2.3", range: "^1.2.3" },
  { name: "partial version", version: "1.2", range: "^1.2.3" },
  { name: "leading-zero version", version: "01.2.3", range: "^1.2.3" },
  { name: "whitespace-padded version", version: " 1.2.3", range: "^1.2.3" },
  { name: "empty version", version: "", range: "^1.2.3" },
  { name: "null version", version: null, range: "^1.2.3" },
  { name: "undefined version", version: undefined, range: "^1.2.3" },
  { name: "number version", version: 1, range: "^1.2.3" },
  { name: "object version", version: {}, range: "^1.2.3" },
  { name: "array version", version: ["1.2.3"], range: "1.2.3" },
  { name: "version past MAX_SAFE_INTEGER", version: "9007199254740992.0.0", range: "^1.2.3" },
]);
