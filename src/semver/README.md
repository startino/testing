# semver

Pure, stateless, **zero-dependency** SemVer 2.0.0 parse/compare/satisfies for
Node v24+ (native ESM, typed via JSDoc). Follows the self-contained module shape
established by [`src/duration/`](../duration/), [`src/slug/`](../slug/),
[`src/csv/`](../csv/), and [`src/lru/`](../lru/), and the conventions fixed in
[`CONTEXT.md`](../../CONTEXT.md).

`parse` reads the **strict** [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html)
grammar and nothing else; `compare` implements §11 precedence; `satisfies`
answers a small, exactly-stated range language. All three **fail closed** and
none of them ever throws.

## API

```js
import { parse, compare, satisfies } from "./semver.mjs";

parse("1.2.3");
// { major: 1, minor: 2, patch: 3, prerelease: [], build: [], version: "1.2.3" }

parse("1.0.0-beta.2+exp.sha.5114f85");
// { major: 1, minor: 0, patch: 0,
//   prerelease: ["beta", 2],            // numeric identifiers come back as NUMBERS
//   build: ["exp", "sha", "5114f85"],   // build identifiers stay verbatim strings
//   version: "1.0.0-beta.2+exp.sha.5114f85" }

parse("1.2.3-0a");   // valid   — an ALPHANUMERIC identifier may start with a zero
parse("1.2.3-01");   // null    — a NUMERIC identifier may not
parse("v1.2.3");     // null    — no `v` prefix (deliberate; npm strips it, this does not)
parse(" 1.2.3");     // null    — no trimming, ever
parse("1.2");        // null    — partial version
parse(1);            // null    — non-string input

compare("1.2.3", "1.2.4");          // -1
compare("2.0.0", "10.0.0");         // -1   (numeric, not lexicographic)
compare("1.0.0-alpha", "1.0.0");    // -1   (a prerelease is lower than its release)
compare("1.0.0-alpha.2", "1.0.0-alpha.11"); // -1  (numeric identifiers compare numerically)
compare("1.0.0-1", "1.0.0-alpha");  // -1   (numeric always ranks below alphanumeric)
compare("1.2.3+a", "1.2.3+b");      //  0   (build metadata is ignored)
compare("nope", "1.2.3");           // null (fail-closed: unreadable input)

satisfies("1.2.9", "^1.2.3");       // true
satisfies("2.0.0", "^1.2.3");       // false  (exclusive upper bound)
satisfies("0.0.4", "^0.0.3");       // false  (caret pins the patch at 0.0.x)
satisfies("0.0.4", "~0.0.3");       // true   (tilde only fixes major+minor)
satisfies("1.2.3-alpha.2", "^1.2.3-alpha.1"); // true
satisfies("1.2.4-alpha", "^1.2.3"); // false  (prerelease gate)
satisfies("1.2.3", ">=1.2.3");      // false  (unsupported range form)
```

### `parse(input) -> SemVer | null`

Parses a strict SemVer 2.0.0 version string into a **frozen** object:

| field | type | what it holds |
| --- | --- | --- |
| `major` / `minor` / `patch` | `number` | safe non-negative integers |
| `prerelease` | `readonly (string \| number)[]` | identifiers left-to-right; numeric ones as **numbers**, alphanumeric ones as **strings**; `[]` when absent |
| `build` | `readonly string[]` | dot-separated build identifiers **verbatim** (leading zeros preserved); `[]` when absent |
| `version` | `string` | the normalized full version string — identical to a valid input |

The grammar it accepts, and the rejections that follow from it:

| rule | accepted | rejected |
| --- | --- | --- |
| shape | `major.minor.patch[-prerelease][+build]` | `1`, `1.2`, `1.2.3.4`, `1.2.3.` |
| core fields | `0`, `1`, `10`, `9007199254740991` | `01.2.3`, `1.02.3`, `1.2.03`, `-1.2.3` |
| numeric prerelease identifier | `1.2.3-1`, `1.0.0-0`, `1.0.0-beta.11` | `1.2.3-01`, `1.2.3-00`, `1.2.3-alpha.01` |
| alphanumeric prerelease identifier | `1.2.3-0a`, `1.2.3-0-1`, `1.2.3--`, `1.2.3-007a` | `1.2.3-alpha_1`, `1.2.3-alpha 1`, `1.2.3-alphá` |
| build metadata | `1.2.3+001`, `1.2.3+exp-sha.5114f85` | `1.2.3+`, `1.2.3+a..b`, `1.2.3+build_1`, `1.2.3++build` |
| empty identifiers | — | `1.2.3-`, `1.2.3+`, `1.2.3-alpha..1` |
| prefixes | — | `v1.2.3`, `V1.2.3`, `=v1.2.3` |
| whitespace | — | `" 1.2.3"`, `"1.2.3 "`, `"1.2.3\n"` (**no trimming**) |
| input type | `string` | `null`, `undefined`, `1`, `{}`, `[1,2,3]`, `true` |
| precision | fields up to `9007199254740991` | `9007199254740992.0.0`, `1.0.0-9007199254740992` |

Two boundaries worth stating out loud:

- **No `v` prefix.** npm's `semver.parse` strips a leading `v`; this module
  rejects it. A parser that accepts two spellings of one version silently makes
  the caller's string comparisons wrong. Normalization is the caller's job.
- **`Number.MAX_SAFE_INTEGER` is a hard ceiling.** The SemVer grammar bounds no
  field width, but a JavaScript number beyond `9007199254740991` loses precision,
  and two distinct versions would then compare **equal**. Rather than return an
  object whose ordering is quietly wrong, `parse` fails closed. This applies to
  `major`, `minor`, `patch`, and every **numeric** prerelease identifier.
  Alphanumeric identifiers are compared as text and are never range-checked.

### `compare(a, b) -> -1 | 0 | 1 | null`

Compares two version **strings** by SemVer §11 precedence. Returns `null` when
either side fails to parse — it never guesses an ordering for a string it could
not read, and it never throws.

| rule | example |
| --- | --- |
| `major`, then `minor`, then `patch`, compared **numerically** | `compare("2.0.0", "10.0.0") === -1` |
| a version **with** a prerelease is **lower** than the same version without one | `compare("1.0.0-alpha", "1.0.0") === -1` |
| numeric identifiers compare **numerically** | `compare("1.0.0-alpha.2", "1.0.0-alpha.11") === -1` |
| a numeric identifier always ranks **below** an alphanumeric one | `compare("1.0.0-1", "1.0.0-alpha") === -1` |
| alphanumeric identifiers compare in **ASCII** sort order | `compare("1.0.0-Beta", "1.0.0-alpha") === -1` |
| when every shared identifier is equal, the **longer** list ranks higher | `compare("1.0.0-alpha", "1.0.0-alpha.1") === -1` |
| **build metadata is ignored entirely** | `compare("1.2.3+a", "1.2.3+b") === 0` |

The spec's example chain, which the suite asserts transitively:

```
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta
            < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
```

**Sorting recipe.** `compare` returns `null` for unreadable input, and a
comparator that returns `null` gives `Array#sort` an implementation-defined
order. So filter first, then sort:

```js
const sorted = list.filter((v) => parse(v) !== null).sort(compare);
```

Because build metadata is excluded from precedence, `compare` is a total order on
**precedence**, not a string-identity test: `1.2.3+a` and `1.2.3+b` are equal to
it, and their relative order after a sort is whatever the sort's stability gives.

### `satisfies(version, range) -> boolean`

Tests a version against a range. Always returns a **boolean** — never `null`,
never a throw. An unreadable version, an unreadable range, and an unsupported
range form all answer `false`.

| range | expands to | example |
| --- | --- | --- |
| `1.2.3` (exact) | `compare(version, "1.2.3") === 0` | `satisfies("1.2.3+ci", "1.2.3") === true` |
| `^1.2.3` | `>=1.2.3 <2.0.0` | `satisfies("1.9.9", "^1.2.3") === true` |
| `^0.2.3` | `>=0.2.3 <0.3.0` | `satisfies("0.3.0", "^0.2.3") === false` |
| `^0.0.3` | `>=0.0.3 <0.0.4` | `satisfies("0.0.4", "^0.0.3") === false` |
| `~1.2.3` | `>=1.2.3 <1.3.0` | `satisfies("1.2.99", "~1.2.3") === true` |
| `~0.0.3` | `>=0.0.3 <0.1.0` | `satisfies("0.0.4", "~0.0.3") === true` |

The caret keeps the leftmost **non-zero** field fixed, encoding the 0.x
convention that a leading zero means the API is unstable one level deeper. The
tilde always fixes **major and minor**. That is why the two differ exactly at
`0.0.x`, where the tilde window is the wider one.

Every upper bound is **exclusive** and is itself **prerelease-free**, so
`2.0.0-alpha` does not satisfy `^1.2.3` — it sorts below `2.0.0` and would
otherwise slip inside the range.

**Prerelease gate.** A version that **has** a prerelease satisfies a range only
when the range's own version **also** has a prerelease **and** carries the
identical `major.minor.patch` tuple.

```js
satisfies("1.2.3-alpha.2", "^1.2.3-alpha.1"); // true  — same core, opted in
satisfies("1.2.4-alpha.1", "^1.2.3-alpha.1"); // false — different core
satisfies("1.2.4-alpha",   "^1.2.3");         // false — the range named no prerelease
satisfies("1.5.0",         "^1.2.3-alpha.1"); // true  — a RELEASE is unaffected by the gate
```

A prerelease is an unreleased, deliberately unstable artifact of **one** specific
core version. Without the gate, `^1.2.3` would silently pull in `1.9.0-rc.1` —
code the range author never opted into. Naming the exact core tuple in the range
**is** the opt-in.

## Scope limitation (intentional)

The supported range language is exactly three forms:

```
range = [ "^" / "~" ] version
```

where `version` is a full strict version that `parse` accepts. Everything else
returns `false`:

| unsupported form | examples |
| --- | --- |
| comparators | `>=1.2.3`, `>1.2.3`, `<2.0.0`, `<=1.2.3`, `=1.2.3`, `>=1.2.3 <2.0.0` |
| x-ranges and wildcards | `1.2.x`, `1.x`, `1.2.X`, `*`, `""`, `^1.2.*` |
| hyphen ranges | `1.2.3 - 2.0.0` |
| unions | `^1.2.3 \|\| ^2.0.0` |
| partial caret/tilde bases | `^1.2`, `^1`, `~1.2`, `~1`, `^`, `~` |
| whitespace-padded ranges | `" 1.2.3"`, `"1.2.3 "`, `"^ 1.2.3"` |
| `v`-prefixed ranges | `v1.2.3`, `^v1.2.3` |

This is the **simple ranges** contract, not an unfinished parser. A full npm
range grammar is substantial and carries its own ambiguities; a module that
implemented half of it would return `false` for two different reasons — "does not
match" and "I did not understand you" — with no way for a caller to tell them
apart. The boundary is drawn where it can be stated in one line and tested
exhaustively. A caller that needs comparators or unions should compose them from
`compare`, which is total over valid versions.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random, no `g`-flag regex
  carrying a `lastIndex`. Same input, same output.
- **Fail-closed** — `parse` returns `null` outside the strict grammar; `compare`
  returns `null` when either side is unreadable; `satisfies` returns `false` for
  anything it cannot read or does not support. Nothing throws, for any input.
- **Immutable results** — the object `parse` returns is frozen, and so are its
  `prerelease` and `build` arrays. A caller cannot mutate a parse result and
  change what a later `compare` sees.
- **Round-trip** — `parse(v).version === v` for every valid `v`. The grammar
  admits exactly one spelling per version, so the normalized string **is** the
  accepted input.
- **Total order on precedence** — `compare` is reflexive, antisymmetric, and
  transitive over valid versions, so `.sort(compare)` is well defined once
  unparseable entries are filtered out.
- **Strict, not lenient** — no trimming, no `v` prefix, no partial versions. The
  caller owns normalization.

## Test

From the repo root (zero deps):

```sh
npm test --prefix src/semver
```

or from inside `src/semver/`:

```sh
node --test
```

> Do **not** pass a bare directory to `node --test` (e.g.
> `node --test __tests__/`): on Node 24 that fails with `MODULE_NOT_FOUND`. Use
> bare `node --test` (auto-discovers `*.test.mjs`), an explicit glob, or an
> explicit file path.

All inputs/expectations live once in [`fixtures.mjs`](./fixtures.mjs); the suite
in [`__tests__/semver.test.mjs`](./__tests__/semver.test.mjs) is table-driven over
the valid-parse, invalid-parse, precedence-chain, compare-anchor,
build-insensitive, fail-closed-compare, satisfies, and unsupported-range tables,
plus property guards: reflexivity, antisymmetry across every fixture pair,
transitivity over every chain triple, sort reproduction from a shuffled chain,
round-trip, frozen-result, purity, and return-type checks.
