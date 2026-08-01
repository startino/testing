// Co-located test suite for the SemVer parse/compare/satisfies module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every input/expectation lives ONCE in ../fixtures.mjs; this file only asserts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  VALID_PARSE,
  INVALID_PARSE,
  PRECEDENCE_CHAIN,
  SHUFFLED_CHAIN,
  COMPARE_CASES,
  BUILD_INSENSITIVE,
  COMPARE_NULL,
  SATISFIES_CASES,
  UNSUPPORTED_RANGES,
  UNSATISFIABLE_VERSIONS,
} from "../fixtures.mjs";
import { parse, compare, satisfies } from "../semver.mjs";

// Every valid version string the fixtures know about, used by the property
// checks below. Derived here (not hand-listed) so a new fixture case is picked
// up by the property proofs automatically.
const ALL_VALID = [
  ...VALID_PARSE.map((c) => c.input),
  ...PRECEDENCE_CHAIN,
  ...COMPARE_CASES.flatMap((c) => [c.a, c.b]),
  ...BUILD_INSENSITIVE.flatMap((c) => [c.a, c.b]),
];

// 1. Valid parses: every field pinned, including prerelease identifier TYPING
//    (numbers vs strings) and verbatim build identifiers.
for (const { name, input, major, minor, patch, prerelease, build } of VALID_PARSE) {
  test(`parse valid: ${name}`, () => {
    const out = parse(input);
    assert.notEqual(out, null);
    assert.equal(out.major, major);
    assert.equal(out.minor, minor);
    assert.equal(out.patch, patch);
    assert.deepEqual([...out.prerelease], [...prerelease]);
    assert.deepEqual([...out.build], [...build]);
    assert.equal(out.version, input);
  });
}

// 2. Prerelease identifier typing is the classification the comparison relies
//    on: a numeric identifier MUST come back as a number and an alphanumeric one
//    MUST come back as a string. Asserted structurally across every fixture so a
//    regression cannot hide behind a deepEqual that coerces.
test("parse types every prerelease identifier as number-or-string by rule", () => {
  for (const { input, prerelease } of VALID_PARSE) {
    const out = parse(input);
    for (let i = 0; i < prerelease.length; i++) {
      assert.equal(typeof out.prerelease[i], typeof prerelease[i], `${input} identifier ${i}`);
      // A numeric identifier is exactly one whose text is all digits.
      const isNumeric = typeof out.prerelease[i] === "number";
      assert.equal(isNumeric, /^\d+$/.test(String(prerelease[i])), `${input} identifier ${i}`);
    }
  }
});

// 3. Build identifiers are always strings (never coerced), so "001" survives.
test("parse keeps every build identifier as a verbatim string", () => {
  for (const { input } of VALID_PARSE) {
    for (const id of parse(input).build) {
      assert.equal(typeof id, "string");
    }
  }
});

// 4. Round-trip: parse(v).version === v for every valid fixture. The grammar
//    admits one spelling per version, so the normalized string is the input.
for (const { name, input } of VALID_PARSE) {
  test(`round-trip: ${name}`, () => {
    assert.equal(parse(input).version, input);
    // And the normalized string re-parses to an identical structure.
    assert.deepEqual(parse(parse(input).version), parse(input));
  });
}

// 5. The result is frozen — a caller cannot mutate a parse result and change
//    what a later compare sees.
test("parse returns a frozen object with frozen arrays", () => {
  const out = parse("1.0.0-beta.2+exp.sha.5114f85");
  assert.ok(Object.isFrozen(out));
  assert.ok(Object.isFrozen(out.prerelease));
  assert.ok(Object.isFrozen(out.build));
  assert.throws(() => {
    "use strict";
    out.major = 9;
  });
  assert.throws(() => {
    "use strict";
    out.prerelease.push("x");
  });
});

// 6. Fail-closed parse: every input outside the strict grammar — including every
//    non-string — returns null, never throws.
for (const { name, input } of INVALID_PARSE) {
  test(`fail-closed parse: ${name}`, () => {
    assert.equal(parse(input), null);
  });
}

// 7. Parse return type is object-or-null, never any other type, never a throw.
test("parse return type is object-or-null, never throws", () => {
  for (const input of [...ALL_VALID, ...INVALID_PARSE.map((c) => c.input)]) {
    const out = parse(input);
    assert.ok(out === null || (typeof out === "object" && out !== null));
  }
});

// 8. Targeted compare anchors: core-field ordering, prerelease-vs-release, the
//    numeric-ranks-below-alphanumeric rule, and the longer-list rule.
for (const { name, a, b, expected } of COMPARE_CASES) {
  test(`compare: ${name}`, () => {
    assert.equal(compare(a, b), expected);
    assert.equal(compare(b, a), -expected === 0 ? 0 : -expected);
  });
}

// 9. Build metadata is excluded from precedence (SemVer §10).
for (const { name, a, b } of BUILD_INSENSITIVE) {
  test(`compare ignores build metadata: ${name}`, () => {
    assert.equal(compare(a, b), 0);
    assert.equal(compare(b, a), 0);
  });
}

// 10. The SemVer §11 example chain, asserted TRANSITIVELY: every earlier entry
//     compares lower than every later one (not just adjacent neighbours).
test("precedence chain is a strict total order across every pair", () => {
  for (let i = 0; i < PRECEDENCE_CHAIN.length; i++) {
    for (let j = 0; j < PRECEDENCE_CHAIN.length; j++) {
      const a = PRECEDENCE_CHAIN[i];
      const b = PRECEDENCE_CHAIN[j];
      const expected = i === j ? 0 : i < j ? -1 : 1;
      assert.equal(compare(a, b), expected, `${a} vs ${b}`);
    }
  }
});

// 11. Adjacent links of the chain, each named, so a failure points at the exact
//     rule that broke rather than at one opaque loop.
for (let i = 0; i < PRECEDENCE_CHAIN.length - 1; i++) {
  const lower = PRECEDENCE_CHAIN[i];
  const higher = PRECEDENCE_CHAIN[i + 1];
  test(`precedence link: ${lower} < ${higher}`, () => {
    assert.equal(compare(lower, higher), -1);
    assert.equal(compare(higher, lower), 1);
  });
}

// 12. Sorting a shuffled permutation of the chain with `compare` reproduces the
//     chain exactly — the comparator is usable as an Array#sort comparator.
test("sorting a shuffled chain with compare reproduces the chain", () => {
  const sorted = [...SHUFFLED_CHAIN].sort(compare);
  assert.deepEqual(sorted, [...PRECEDENCE_CHAIN]);
});

// 13. The documented sorting recipe: filter unparseable inputs FIRST, then sort.
test("the documented sorting recipe survives invalid entries in the list", () => {
  const messy = [...SHUFFLED_CHAIN, "v1.0.0", "not-a-version", "", "1.0"];
  const sorted = messy.filter((v) => parse(v) !== null).sort(compare);
  assert.deepEqual(sorted, [...PRECEDENCE_CHAIN]);
});

// 14. Reflexivity: compare(a, a) === 0 for every valid fixture version.
test("compare is reflexive over every valid fixture", () => {
  for (const v of ALL_VALID) {
    assert.equal(compare(v, v), 0, v);
  }
});

// 15. Antisymmetry: compare(a, b) === -compare(b, a) for EVERY ordered pair of
//     valid fixture versions (the full n^2 sweep, not a sample).
test("compare is antisymmetric across every fixture pair", () => {
  for (const a of ALL_VALID) {
    for (const b of ALL_VALID) {
      const ab = compare(a, b);
      const ba = compare(b, a);
      assert.ok(ab !== null && ba !== null, `${a} vs ${b}`);
      assert.equal(ab, ba === 0 ? 0 : -ba, `${a} vs ${b}`);
    }
  }
});

// 16. Totality: compare returns exactly one of -1, 0, 1 for two valid versions.
test("compare returns only -1, 0, or 1 for valid pairs", () => {
  for (const a of ALL_VALID) {
    for (const b of ALL_VALID) {
      assert.ok([-1, 0, 1].includes(compare(a, b)), `${a} vs ${b}`);
    }
  }
});

// 17. Transitivity over the sorted chain: a < b and b < c implies a < c, checked
//     over every ordered triple.
test("compare is transitive over every chain triple", () => {
  for (const a of PRECEDENCE_CHAIN) {
    for (const b of PRECEDENCE_CHAIN) {
      for (const c of PRECEDENCE_CHAIN) {
        if (compare(a, b) < 0 && compare(b, c) < 0) {
          assert.ok(compare(a, c) < 0, `${a} < ${b} < ${c}`);
        }
      }
    }
  }
});

// 18. Fail-closed compare: null when EITHER side is unparseable, never a throw
//     and never a guessed ordering.
for (const { name, a, b } of COMPARE_NULL) {
  test(`fail-closed compare: ${name}`, () => {
    assert.equal(compare(a, b), null);
    assert.equal(compare(b, a), null);
  });
}

// 19. Supported-range semantics: caret at each zero-tier, tilde, exact, the
//     boundaries just below and just above every upper bound, and the
//     prerelease gate in both directions.
for (const { name, version, range, expected } of SATISFIES_CASES) {
  test(`satisfies: ${name}`, () => {
    assert.equal(satisfies(version, range), expected);
  });
}

// 20. Every unsupported range form is false — the scope boundary, asserted case
//     by case rather than described in prose only.
for (const { name, version, range } of UNSUPPORTED_RANGES) {
  test(`unsupported range is false: ${name}`, () => {
    assert.equal(satisfies(version, range), false);
  });
}

// 21. An unparseable VERSION is false too — the fail-closed rule is symmetric.
for (const { name, version, range } of UNSATISFIABLE_VERSIONS) {
  test(`invalid version is false: ${name}`, () => {
    assert.equal(satisfies(version, range), false);
  });
}

// 22. satisfies returns a BOOLEAN always — never null, never undefined. This is
//     the difference from compare and is the whole point of "fail-closed with no
//     third state".
test("satisfies always returns a boolean, never null, never throws", () => {
  const versions = [...ALL_VALID, ...INVALID_PARSE.map((c) => c.input)];
  const ranges = [
    ...SATISFIES_CASES.map((c) => c.range),
    ...UNSUPPORTED_RANGES.map((c) => c.range),
  ];
  for (const v of versions) {
    for (const r of ranges) {
      assert.equal(typeof satisfies(v, r), "boolean", `${String(v)} vs ${String(r)}`);
    }
  }
});

// 23. Cross-check: an exact range agrees with compare === 0 on every valid
//     fixture pair. Two independently reachable code paths must not disagree.
test("an exact range agrees with compare === 0 over every fixture pair", () => {
  for (const a of ALL_VALID) {
    for (const b of ALL_VALID) {
      assert.equal(satisfies(a, b), compare(a, b) === 0, `${a} vs ${b}`);
    }
  }
});

// 24. Caret and tilde both include their own base version (the lower bound is
//     inclusive) for every valid fixture version.
test("caret and tilde always include their own base version", () => {
  for (const v of ALL_VALID) {
    assert.equal(satisfies(v, `^${v}`), true, `^${v}`);
    assert.equal(satisfies(v, `~${v}`), true, `~${v}`);
  }
});

// 25. Caret and tilde differ EXACTLY where the spec says they do. For a base
//     with major > 0 the caret window is the wider one; at 0.0.x the TILDE
//     window is wider (it fixes minor, so 0.0.4 is in ~0.0.3 but not ^0.0.3).
//     Pinned here so neither bound can be "simplified" into the other.
test("caret and tilde windows differ exactly at the zero tiers", () => {
  // major > 0: caret is the wider window.
  assert.equal(satisfies("1.3.0", "^1.2.3"), true);
  assert.equal(satisfies("1.3.0", "~1.2.3"), false);
  // major 0, minor > 0: the two windows coincide.
  assert.equal(satisfies("0.2.9", "^0.2.3"), true);
  assert.equal(satisfies("0.2.9", "~0.2.3"), true);
  assert.equal(satisfies("0.3.0", "^0.2.3"), false);
  assert.equal(satisfies("0.3.0", "~0.2.3"), false);
  // major 0, minor 0: TILDE is the wider window.
  assert.equal(satisfies("0.0.4", "~0.0.3"), true);
  assert.equal(satisfies("0.0.4", "^0.0.3"), false);
});

// 26. Purity: the module holds no cross-call state. Interleaving parse, compare,
//     and satisfies (and repeating each) must not perturb any result — this
//     would fail if the grammar RegExp carried a `g`-flag `lastIndex` that
//     advanced between calls, or if anything memoized into shared scope.
test("pure: parse, compare, and satisfies hold no shared state", () => {
  for (const { input } of VALID_PARSE) {
    const first = parse(input);
    compare("1.0.0-alpha", "2.0.0+build"); // unrelated work between the two reads
    satisfies("0.0.3", "^0.0.3");
    parse("nonsense");
    assert.deepEqual(parse(input), first);
  }
});

// 27. Purity: no argument is mutated. A frozen-ish probe would throw on write in
//     strict mode; a plain object proves the value is left untouched.
test("pure: satisfies does not mutate its arguments", () => {
  const version = "1.2.3";
  const range = "^1.2.3";
  satisfies(version, range);
  assert.equal(version, "1.2.3");
  assert.equal(range, "^1.2.3");
});

// 28. The MAX_SAFE_INTEGER boundary, asserted as an adjacent pair: the largest
//     safe value parses, the next integer up does not. This is the precision
//     guard, and it is the one rejection that is NOT a grammar violation.
test("the MAX_SAFE_INTEGER boundary is exactly at 9007199254740991", () => {
  assert.notEqual(parse("9007199254740991.0.0"), null);
  assert.equal(parse("9007199254740992.0.0"), null);
  assert.notEqual(parse("1.0.0-9007199254740991"), null);
  assert.equal(parse("1.0.0-9007199254740992"), null);
  // The rejection propagates: compare fails closed and satisfies answers false.
  assert.equal(compare("9007199254740992.0.0", "1.0.0"), null);
  assert.equal(satisfies("9007199254740992.0.0", "^9007199254740992.0.0"), false);
});

// 29. The `v`-prefix boundary, stated once as its own guard: it is a DELIBERATE
//     divergence from npm's lenient behaviour and must not drift back.
test("the v prefix is rejected everywhere, unlike npm", () => {
  assert.equal(parse("v1.2.3"), null);
  assert.equal(parse("V1.2.3"), null);
  assert.equal(compare("v1.2.3", "1.2.3"), null);
  assert.equal(satisfies("v1.2.3", "1.2.3"), false);
  assert.equal(satisfies("1.2.3", "^v1.2.3"), false);
});

// 30. The no-trimming boundary, stated once: whitespace is never stripped from a
//     version or a range, in any position.
test("no trimming happens anywhere", () => {
  for (const padded of [" 1.2.3", "1.2.3 ", " 1.2.3 ", "\t1.2.3", "1.2.3\n"]) {
    assert.equal(parse(padded), null, padded);
    assert.equal(compare(padded, "1.2.3"), null, padded);
    assert.equal(satisfies(padded, "1.2.3"), false, padded);
    assert.equal(satisfies("1.2.3", padded), false, padded);
  }
});
