// SemVer 2.0.0 parse/compare/satisfies — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/duration/, src/slug/, src/csv/, and src/lru/.
// Rationale: every operation this module needs — one anchored regex, an integer
// comparison chain, and a lexicographic walk over identifier lists — is pure
// ECMAScript. There is nothing to install, nothing to build, and no reason to
// take on `node-semver` (a multi-file dependency whose lenient surface is the
// opposite of what this module promises). `node --test` runs the suite with the
// same zero-dependency guarantee.
//
// ACCEPTED GRAMMAR (SemVer 2.0.0 §2, §9, §10 — https://semver.org/spec/v2.0.0.html):
//
//   version    = major "." minor "." patch [ "-" prerelease ] [ "+" build ]
//   major      = numeric
//   minor      = numeric
//   patch      = numeric
//   numeric    = "0" / non-zero-digit *digit          ; NO leading zeros
//   prerelease = pre-id *( "." pre-id )               ; >= 1 identifier
//   pre-id     = numeric                              ; numeric identifier
//              / *digit ( alpha / "-" ) *( alnum / "-" )  ; alphanumeric identifier
//   build      = build-id *( "." build-id )           ; >= 1 identifier
//   build-id   = 1*( alnum / "-" )                    ; leading zeros allowed
//
// Two grammar subtleties that are load-bearing and easy to get wrong:
//   - A NUMERIC prerelease identifier must not carry a leading zero ("1.2.3-01"
//     is invalid), because it is compared as a number and "01" vs "1" would be
//     two spellings of one precedence value. An ALPHANUMERIC identifier MAY begin
//     with a zero ("1.2.3-0a" is VALID) — it is compared as text, so there is no
//     ambiguity to resolve.
//   - BUILD identifiers are never compared, so leading zeros are allowed there
//     ("1.2.3+001" is valid) and the identifiers are kept verbatim.
//
// DELIBERATE BOUNDARY — no leniency. `parse` accepts the strict grammar and
// nothing else. In particular a "v" / "V" prefix is REJECTED ("v1.2.3" -> null),
// unlike npm's `semver.parse`, which strips it. So are partial versions ("1",
// "1.2"), extra segments ("1.2.3.4"), and ANY surrounding whitespace — there is
// no trimming anywhere in this module. The caller owns normalization; a parser
// that guesses is a parser that silently accepts two spellings of one version.
//
// PRECISION BOUNDARY. JavaScript has no integer type, so a version field beyond
// Number.MAX_SAFE_INTEGER (9007199254740991) cannot be held without silently
// losing precision — 9007199254740993 and 9007199254740992 would compare EQUAL.
// Rather than return a version whose ordering is quietly wrong, `parse` fails
// closed (null) when major, minor, patch, or a NUMERIC prerelease identifier
// exceeds that bound. This is a real (if remote) boundary of the grammar, which
// itself places no limit on field width, and it is stated rather than hidden.
//
// FAIL-CLOSED CONTRACT: no function in this module throws, for any input.
//   - `parse`     returns null for every input outside the grammar above,
//                 including every non-string input (null, undefined, number,
//                 object, array, boolean).
//   - `compare`   returns null when EITHER side fails to parse. It never throws
//                 and never guesses an ordering for a string it cannot read.
//   - `satisfies` returns false — never null, never a throw — for an unparseable
//                 version, an unparseable range, and every range form outside
//                 the supported subset. A boolean predicate has no third state
//                 to report "I could not tell", so the safe answer is "no".
//
// PRECEDENCE (SemVer §11), implemented by `compare`:
//   1. major, then minor, then patch, compared NUMERICALLY.
//   2. A version WITH a prerelease has LOWER precedence than the same
//      major.minor.patch WITHOUT one: 1.0.0-alpha < 1.0.0.
//   3. Two prereleases compare identifier-by-identifier, left to right:
//        - numeric vs numeric      -> numeric comparison
//        - alphanumeric vs alnum   -> ASCII sort order
//        - numeric vs alphanumeric -> the NUMERIC one is always lower
//      When every shared identifier is equal, the LONGER identifier list wins.
//   4. BUILD METADATA IS IGNORED ENTIRELY: compare("1.2.3+a", "1.2.3+b") === 0.
//      Two versions differing only in build metadata have EQUAL precedence, so
//      `compare` is a correct total order on precedence but is NOT a test of
//      string identity. That is the spec's rule (§10), not a shortcut.
//
// RANGE SUBSET (`satisfies`) — the "simple ranges" contract. Only three forms
// are supported: an exact version, a caret range, and a tilde range, each over a
// FULL strict version. Every richer npm range form — comparators (">=1.2.3"),
// x-ranges ("1.2.x", "*"), hyphen ranges ("1.2.3 - 2.0.0"), partial carets
// ("^1.2"), and "||" unions — returns false. See the block comment on
// `satisfies` for why that subset is a feature and not an unfinished parser.

/** Largest integer JavaScript can hold without losing precision. @type {number} */
const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/**
 * The empty prerelease list, shared by every range upper bound `upperBound`
 * builds. Hoisted to module scope (rather than rebuilt per call) because it is a
 * frozen constant with no per-call state, and annotated explicitly because an
 * empty array literal would otherwise infer as an evolving `any[]` — which
 * `checkJs` consumers of this module, such as the web app's `svelte-check`,
 * correctly reject. The annotation is the type this value is USED as, so the
 * JSDoc and the runtime value state the same fact.
 *
 * @type {ReadonlyArray<string|number>}
 */
const NO_PRERELEASE = Object.freeze([]);

/**
 * The official SemVer 2.0.0 grammar, anchored to the whole input.
 *
 * Capture groups: 1 major, 2 minor, 3 patch, 4 prerelease (dot-joined, without
 * the leading "-"), 5 build (dot-joined, without the leading "+").
 *
 * The pieces that do the real work:
 *   - `(0|[1-9]\d*)` for each core field forbids a leading zero while still
 *     admitting a lone "0". This is the ONLY thing rejecting "01.2.3".
 *   - A prerelease identifier is `(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`. The
 *     first two alternatives are the leading-zero-free numeric identifier; the
 *     third requires at least one non-digit, which is what makes "0a" valid
 *     (alphanumeric) while "01" stays invalid (it can only try the numeric
 *     alternatives, and both reject the leading zero).
 *   - Every identifier group is `1*` by construction and the separators are
 *     literal dots, so an EMPTY identifier cannot match: "1.2.3-", "1.2.3+",
 *     "1.2.3-alpha..1", and "1.2.3+a..b" all fail here.
 *   - The character classes are exactly `[0-9A-Za-z-]`, so any other character
 *     (including whitespace, "_", "+", and non-ASCII) fails to match.
 *   - The `^...$` anchors — with no `\s` allowance and no `m` flag — are what
 *     make surrounding whitespace and a "v" prefix hard rejections rather than
 *     something a trim would paper over.
 *
 * The regex has NO `g` flag: a `g`-flagged RegExp carries a mutable `lastIndex`
 * across calls, which would make this module stateful.
 *
 * @type {RegExp}
 */
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/**
 * True when a prerelease identifier is NUMERIC (all digits). The grammar has
 * already guaranteed such an identifier carries no leading zero, so this test
 * needs no further shape check — it only decides which comparison rule (and
 * which JS type) the identifier gets.
 *
 * @param {string} id a grammar-valid prerelease identifier
 * @returns {boolean} true when the identifier is a numeric identifier
 */
function isNumericIdentifier(id) {
  return /^\d+$/.test(id);
}

/**
 * A parsed, frozen SemVer version.
 *
 * @typedef {object} SemVer
 * @property {number} major safe non-negative integer
 * @property {number} minor safe non-negative integer
 * @property {number} patch safe non-negative integer
 * @property {ReadonlyArray<string|number>} prerelease prerelease identifiers,
 *   numeric ones as numbers and alphanumeric ones as strings; `[]` when absent
 * @property {ReadonlyArray<string>} build build identifiers, verbatim (leading
 *   zeros preserved, never compared); `[]` when absent
 * @property {string} version the normalized full version string — identical to
 *   the input, because the grammar admits exactly one spelling per version
 */

/**
 * Parse a strict SemVer 2.0.0 version string (see the grammar in the file
 * header) into a frozen `SemVer`.
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — for every
 * input outside the grammar, including non-string input, empty/whitespace,
 * surrounding whitespace (there is NO trimming), a `v`/`V` prefix, partial
 * versions, extra segments, leading zeros in a core field or a numeric
 * prerelease identifier, empty prerelease/build identifiers, any character
 * outside `[0-9A-Za-z-]` in an identifier, and any numeric field that exceeds
 * `Number.MAX_SAFE_INTEGER`.
 *
 * The returned object and both of its arrays are frozen, so a caller cannot
 * mutate a parse result and change what a later `compare` sees.
 *
 * @param {*} input the candidate version string
 * @returns {SemVer|null} the parsed version, or `null` for invalid input
 */
export function parse(input) {
  if (typeof input !== "string") return null;

  const match = SEMVER_RE.exec(input);
  if (!match) return null;

  const [, majorText, minorText, patchText, prereleaseText, buildText] = match;

  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);

  // Precision guard (see the file header). The grammar bounds no field width, so
  // a caller CAN hand us a 30-digit major. Beyond MAX_SAFE_INTEGER the value no
  // longer round-trips through a JS number and two distinct versions would
  // compare equal — fail closed rather than return a silently mis-ordering
  // object. `Number.isSafeInteger` also covers the Infinity case for absurd
  // widths, where Number() saturates rather than merely rounding.
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }

  /** @type {Array<string|number>} */
  const prerelease = [];
  if (prereleaseText !== undefined) {
    for (const id of prereleaseText.split(".")) {
      if (isNumericIdentifier(id)) {
        const value = Number(id);
        // Same precision guard, for the identifiers that are compared
        // NUMERICALLY. An alphanumeric identifier is compared as text, so its
        // width is irrelevant and it is never range-checked.
        if (value > MAX_SAFE) return null;
        prerelease.push(value);
      } else {
        prerelease.push(id);
      }
    }
  }

  // Build identifiers are kept verbatim as strings: they are never compared
  // (§10), so coercing a numeric-looking one would destroy information ("001")
  // for no gain.
  const build = buildText === undefined ? [] : buildText.split(".");

  return Object.freeze({
    major,
    minor,
    patch,
    prerelease: Object.freeze(prerelease),
    build: Object.freeze(build),
    // The grammar admits exactly one spelling of any given version, so the
    // normalized string IS the accepted input. Echoing it (rather than
    // re-rendering from the fields) keeps `parse(v).version === v` exact and
    // preserves build metadata, which a re-render would have to reassemble.
    version: input,
  });
}

/**
 * Compare two prerelease identifier lists per SemVer §11. Callers guarantee that
 * neither list is empty (the has-prerelease-vs-not rule is settled before this
 * is reached), so this only implements the identifier-by-identifier walk.
 *
 * @param {ReadonlyArray<string|number>} a left identifier list
 * @param {ReadonlyArray<string|number>} b right identifier list
 * @returns {-1|0|1} the precedence relation of `a` to `b`
 */
function comparePrerelease(a, b) {
  const shared = Math.min(a.length, b.length);

  for (let i = 0; i < shared; i++) {
    const left = a[i];
    const right = b[i];
    if (left === right) continue;

    const leftIsNumeric = typeof left === "number";
    const rightIsNumeric = typeof right === "number";

    // Mixed types: "Numeric identifiers always have lower precedence than
    // alphanumeric identifiers" (§11.4.3). This rule is why the parse step types
    // numeric identifiers as numbers — the type IS the classification, so the
    // comparison never has to re-inspect the text.
    if (leftIsNumeric && !rightIsNumeric) return -1;
    if (!leftIsNumeric && rightIsNumeric) return 1;

    // Same type: numbers compare numerically, strings compare in ASCII sort
    // order. JS string relational comparison is UTF-16 code-unit order, which
    // over the identifier alphabet `[0-9A-Za-z-]` is exactly ASCII order — so
    // no locale-aware comparison (which WOULD differ) is used here.
    return left < right ? -1 : 1;
  }

  // Every shared identifier is equal: "a larger set of pre-release fields has a
  // higher precedence than a smaller set, if all of the preceding identifiers
  // are equal" (§11.4.4). So 1.0.0-alpha < 1.0.0-alpha.1.
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}

/**
 * Compare two already-parsed versions (or bare core-field tuples) by precedence.
 * Build metadata is ignored, per §10.
 *
 * This is the shared engine behind the public `compare` and behind the range
 * bound checks in `satisfies`, so both use one definition of precedence.
 *
 * @param {{major: number, minor: number, patch: number, prerelease: ReadonlyArray<string|number>}} a
 * @param {{major: number, minor: number, patch: number, prerelease: ReadonlyArray<string|number>}} b
 * @returns {-1|0|1} the precedence relation of `a` to `b`
 */
function compareParsed(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;

  const aPre = a.prerelease.length > 0;
  const bPre = b.prerelease.length > 0;

  // §11.3: a prerelease version has LOWER precedence than the normal version of
  // the same core tuple. 1.0.0-alpha < 1.0.0.
  if (aPre && !bPre) return -1;
  if (!aPre && bPre) return 1;
  if (!aPre && !bPre) return 0;

  return comparePrerelease(a.prerelease, b.prerelease);
}

/**
 * Compare two version STRINGS by SemVer §11 precedence.
 *
 * Pure and stateless. Fail-closed: returns `null` — never throws — when EITHER
 * argument fails `parse`. Otherwise returns `-1` when `a` has lower precedence
 * than `b`, `1` when higher, and `0` when they are equal in precedence.
 *
 * Build metadata is IGNORED: `compare("1.2.3+a", "1.2.3+b") === 0`. `compare` is
 * therefore a total order on PRECEDENCE, not a string-identity test.
 *
 * Sorting recipe (the `null` return makes the naive `.sort(compare)` unsafe on
 * unvetted input — a comparator that returns `null` yields an implementation-
 * defined order, so filter first):
 *
 * ```js
 * const sorted = list.filter((v) => parse(v) !== null).sort(compare);
 * ```
 *
 * @param {*} a the left version string
 * @param {*} b the right version string
 * @returns {-1|0|1|null} the precedence relation, or `null` if either side is invalid
 */
export function compare(a, b) {
  const left = parse(a);
  if (left === null) return null;
  const right = parse(b);
  if (right === null) return null;

  return compareParsed(left, right);
}

/**
 * Compute the EXCLUSIVE upper bound of a caret or tilde range, as a bare core
 * tuple with an empty prerelease list.
 *
 * The bound is deliberately prerelease-free. An exclusive bound of `2.0.0` with
 * no prerelease excludes `2.0.0-alpha` too, because `2.0.0-alpha` sorts BELOW
 * `2.0.0` and would otherwise slip inside `^1.2.3`. Combined with the prerelease
 * gate in `satisfies`, that is the npm-compatible behaviour: a prerelease of the
 * NEXT major is never inside the current one.
 *
 * Caret keeps the leftmost NON-ZERO core field fixed (`^1.2.3` -> `<2.0.0`,
 * `^0.2.3` -> `<0.3.0`, `^0.0.3` -> `<0.0.4`), which encodes "compatible with"
 * under the 0.x convention that a leading zero means the API is unstable one
 * level deeper. Tilde always fixes major AND minor (`~1.2.3` -> `<1.3.0`,
 * `~0.0.3` -> `<0.1.0`), which is why tilde and caret differ exactly at 0.0.x.
 *
 * A field can be at most `MAX_SAFE` here (parse enforces it), so the `+ 1` can
 * land one past the safe range. That does not affect correctness: any parseable
 * version's field is `<= MAX_SAFE`, which is still strictly less than the
 * rounded bound, so the comparison answers the same.
 *
 * @param {"^"|"~"} operator the range operator
 * @param {SemVer} base the range's own parsed version
 * @returns {{major: number, minor: number, patch: number, prerelease: ReadonlyArray<string|number>}} the exclusive bound
 */
function upperBound(operator, base) {
  if (operator === "~") {
    return { major: base.major, minor: base.minor + 1, patch: 0, prerelease: NO_PRERELEASE };
  }

  if (base.major !== 0) {
    return { major: base.major + 1, minor: 0, patch: 0, prerelease: NO_PRERELEASE };
  }
  if (base.minor !== 0) {
    return { major: 0, minor: base.minor + 1, patch: 0, prerelease: NO_PRERELEASE };
  }
  return { major: 0, minor: 0, patch: base.patch + 1, prerelease: NO_PRERELEASE };
}

/**
 * Test whether `version` satisfies `range`.
 *
 * SUPPORTED RANGE GRAMMAR — and ONLY this ("simple ranges"):
 *
 *   range = [ "^" / "~" ] version
 *
 * where `version` is a full strict version that `parse` accepts. So `1.2.3`
 * (exact), `^1.2.3`, and `~1.2.3` are the entire language. Every richer npm form
 * returns `false`: comparators (`>=1.2.3`, `<2.0.0`), x-ranges (`1.2.x`, `1.x`,
 * `*`, `""`), hyphen ranges (`1.2.3 - 2.0.0`), partial carets/tildes (`^1.2`,
 * `~1`), `||` unions, and any whitespace-padded range (there is NO trimming).
 *
 * That subset is the contract, not an unfinished parser. A full npm range parser
 * is a substantial grammar with its own ambiguities; a module that accepted half
 * of it would answer `false` for two different reasons — "does not match" and
 * "I did not understand you" — with no way for a caller to tell them apart. The
 * boundary is drawn where it can be stated in one line and tested exhaustively.
 *
 * Semantics (npm-compatible):
 *   - exact `1.2.3` matches iff `compare(version, "1.2.3") === 0`, so build
 *     metadata on either side is ignored.
 *   - `^1.2.3` -> `>=1.2.3 <2.0.0`; `^0.2.3` -> `>=0.2.3 <0.3.0`;
 *     `^0.0.3` -> `>=0.0.3 <0.0.4`.
 *   - `~1.2.3` -> `>=1.2.3 <1.3.0`; `~0.0.3` -> `>=0.0.3 <0.1.0`.
 *
 * PRERELEASE GATE. A version that HAS a prerelease satisfies a range only when
 * the range's own version ALSO has a prerelease AND carries the identical
 * major.minor.patch tuple. So `1.2.3-alpha.2` satisfies `^1.2.3-alpha.1`, but
 * `1.2.4-alpha.1` does NOT, and `1.2.4-alpha` does not satisfy `^1.2.3`. The
 * reason: a prerelease is an unreleased, deliberately unstable artifact of ONE
 * specific core version. Letting it match a range it was never named in would
 * mean `^1.2.3` silently pulls in `1.9.0-rc.1` — code the range author never
 * opted into. Naming the exact core tuple in the range IS the opt-in.
 *
 * Pure and stateless. Fail-closed: returns `false` — never `null`, never a
 * throw — for a non-string version, a non-string range, an unparseable version,
 * an unparseable range base, and every unsupported range form.
 *
 * @param {*} version the version string under test
 * @param {*} range a range in the supported subset above
 * @returns {boolean} true iff `version` satisfies `range`
 */
export function satisfies(version, range) {
  if (typeof range !== "string" || range.length === 0) return false;

  // The operator is a single leading character, or absent for an exact range.
  // Everything after it must be a FULL strict version — which is what rejects
  // `>=1.2.3` (">" is not an operator here, so ">=1.2.3" is parsed whole and
  // fails), `1.2.x`, `*`, `^1.2`, unions, and whitespace padding, all through
  // one guard rather than a denylist that could miss a form.
  const first = range[0];
  const operator = first === "^" || first === "~" ? first : "";
  const baseText = operator === "" ? range : range.slice(1);

  const base = parse(baseText);
  if (base === null) return false;

  const target = parse(version);
  if (target === null) return false;

  const sameCore =
    target.major === base.major && target.minor === base.minor && target.patch === base.patch;

  // Prerelease gate (see the block above). Applied BEFORE the bound checks so it
  // governs every range form, including the exact one — though for an exact
  // range the gate is implied by the equality test that follows.
  if (target.prerelease.length > 0) {
    if (base.prerelease.length === 0) return false;
    if (!sameCore) return false;
  }

  if (operator === "") return compareParsed(target, base) === 0;

  // Inclusive lower bound, exclusive upper bound. Both run through the same
  // `compareParsed` the public `compare` uses, so a range decision can never
  // disagree with a sort.
  if (compareParsed(target, base) < 0) return false;
  return compareParsed(target, upperBound(operator, base)) < 0;
}
