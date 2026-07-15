# csv

Pure, stateless, **zero-dependency** RFC-4180 CSV codec for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/bytes/`](../bytes/), [`src/unicode/`](../unicode/), [`src/slug/`](../slug/),
and [`src/duration/`](../duration/).

`parse` reads a permissive superset of the [RFC-4180](https://www.rfc-editor.org/rfc/rfc4180)
grammar into rows; `stringify` emits the strict canonical form with **minimal
quoting**. The two compose into a round-trip law — `parse(stringify(rows))`
deep-equals `rows` for any string-celled `rows`, including cells that contain the
delimiter, embedded quotes, and embedded line breaks. Both functions are
**fail-closed**: `parse` returns `[]` and `stringify` returns `""` on bad input,
and neither ever throws.

## API

```js
import { parse, stringify } from "./csv.mjs";

// parse: CSV text -> rows (string[][], or object[] with { header: true })
parse("a,b,c\r\n1,2,3");            // [["a","b","c"], ["1","2","3"]]
parse('"a,b",c');                   // [["a,b", "c"]]         (quoted delimiter)
parse('"she said ""hi"""');         // [['she said "hi"']]    (doubled quotes)
parse('"line1\nline2",tail');       // [["line1\nline2","tail"]] (embedded newline)
parse("a\nb\nc");                   // [["a"],["b"],["c"]]    (lone-LF tolerated)
parse("a,b\r\n");                   // [["a","b"]]            (trailing sep ignored)
parse("");                          // []                     (empty input)
parse("a\tb\tc", { delimiter: "\t" }); // [["a","b","c"]]     (TSV)
parse("name,age\r\nAda,36", { header: true }); // [{ name:"Ada", age:"36" }]
parse(null);                        // []                     (fail-closed)

// stringify: rows -> canonical CSV (string[][], or object[] with { header:true })
stringify([["a","b"],["c","d"]]);   // "a,b\r\nc,d"
stringify([["a,b","c"]]);           // '"a,b",c'              (minimal quoting)
stringify([['she said "hi"']]);     // '"she said ""hi"""'
stringify([["has\nlf"]]);           // '"has\nlf"'
stringify([{ name:"Ada", age:"36" }], { header: true }); // "name,age\r\nAda,36"
stringify([], );                    // ""                     (fail-closed)
```

### `parse(text, opts?) -> string[][] | Record<string,string>[]`

Reads CSV `text` into rows. The reader is **total** for string input — it never
throws and never rejects a string; malformed-but-parseable shapes are resolved by
documented tolerances.

| step | what it does |
| --- | --- |
| guard | non-string `text` or invalid `delimiter` -> `[]` |
| fields | split on the `delimiter` (default `,`) outside of quotes |
| quotes | a field may be wrapped in `"..."`; inside, `""` is one literal `"`, and delimiters / line breaks are literal data |
| records | `\r\n`, lone `\n`, and lone `\r` all separate records (outside quotes) |
| trailing | a record separator at end-of-input does **not** add an empty record |
| header | with `header: true`, the first record is the column names and each following record becomes an object keyed by them (missing trailing cells fill as `""`) |

**Options** — `delimiter` (default `","`; a single character other than `"`,
`\r`, `\n` — otherwise fail-closed to `[]`) and `header` (default `false`).

Tolerances worth knowing: a double quote is special **only at the start of a
field**, so `a"b` in an unquoted field is the literal `a"b`; and empty input
parses to `[]`.

### `stringify(rows, opts?) -> string`

Serialises `rows` into canonical RFC-4180 CSV — the inverse of `parse`.

| step | what it does |
| --- | --- |
| guard | non-array / empty `rows`, or invalid `delimiter` -> `""` |
| quoting | a field is quoted **iff** it contains the delimiter, a `"`, a `\r`, or a `\n`; otherwise emitted bare (**minimal quoting** — spaces are not special) |
| escaping | inside a quoted field, every `"` is doubled |
| records | joined by `\r\n` (CRLF) with **no trailing separator** |
| cells | `null`/`undefined` -> empty field; every other value coerced with `String(...)` |
| header | with `header: true`, `rows` is an array of objects; the column order comes from the first object's keys, a header record is emitted first, and each row is written in that column order |

**Options** — `delimiter` (default `","`; same validity rule as `parse`) and
`header` (default `false`).

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same
  output; inputs are never mutated.
- **Fail-closed — and provably never throws** — `parse` returns `[]` on a
  non-string `text` or invalid `delimiter`; `stringify` returns `""` on a
  non-array/empty `rows` or invalid `delimiter`. Across a hostile input grid the
  return type stays array-or-nothing / string, never a throw.
- **Round-trip law (honest)** — `parse(stringify(rows))` deep-equals `rows` for
  every `rows` whose cells are **strings**, including cells bearing the
  delimiter, embedded quotes, and embedded CR/LF. Two boundaries: it is **not**
  promised for non-string cells (the writer coerces `42` to `"42"` and the reader
  returns the string `"42"`); and it excludes the degenerate **all-empty-boundary**
  case — a grid whose whole serialisation is empty or only record separators
  (`[[""]]` -> `""`) cannot round-trip, since an empty field at a document
  boundary is indistinguishable from an empty document (the inherent CSV
  ambiguity). Any row with a non-empty cell, or an internal empty field like
  `["", "x"]`, is unambiguous and round-trips. In `header` mode the law holds for
  objects that share one key set (the header is derived from the first row's
  keys, and every row is written in that column order).
- **Canonical writer / permissive reader** — the writer emits exactly one
  spelling per grid (minimal quoting, CRLF joins, no trailing separator); the
  reader accepts that spelling plus the common real-world variants (lone-CR/LF
  separators, trailing separators, mid-field literal quotes). The asymmetry is
  deliberate: emit strictly, read forgivingly.
- **Zero-dependency doctrine** — strictly stdlib (string walk + `String.prototype`
  methods); no install, no build step. The test suite uses Node's built-in
  `node:test` + `node:assert/strict`, adding no dependency either.

## Test

From the repo root (zero deps):

```sh
npm test --prefix src/csv
```

or from inside `src/csv/`:

```sh
node --test
```

> Do **not** pass a bare directory to `node --test` (e.g. `node --test .`): on
> Node 24 that fails with `MODULE_NOT_FOUND`. Use bare `node --test`
> (auto-discovers `*.test.mjs`), an explicit glob, or an explicit file path.

All inputs/expectations live once in [`fixtures.mjs`](./fixtures.mjs); the suite
in [`csv.test.mjs`](./csv.test.mjs) is table-driven over the parse, stringify,
round-trip, and fail-closed (parse and stringify) tables, plus purity,
return-type, and minimal-quoting guards.
