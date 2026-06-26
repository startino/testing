# bytes

Pure, stateless, **zero-dependency** IEC byte-count format/parse for Node v24+
(native ESM, typed via JSDoc). Follows the self-contained module shape
established by [`src/unicode/`](../unicode/), [`src/slug/`](../slug/),
[`src/flags/`](../flags/), and [`src/duration/`](../duration/).

`formatBytes` emits a human-readable **IEC byte string** (base 1024 units `B`,
`KiB`, `MiB`, `GiB`, `TiB`, `PiB`); `parseBytes` is its **true strict inverse** —
it accepts a string **iff** that string is exactly what `formatBytes` emits for
the byte count it denotes, and fails closed (`null`) on everything else. There is
no superset: a non-canonical spelling of a real count (`"0.5 KiB"`, `"2048 KiB"`,
`"0 PiB"`) is rejected in favour of its canonical form (`"512 B"`, `"2 MiB"`,
`"0 B"`). Both functions share one domain, `[0, Number.MAX_SAFE_INTEGER]`.

## API

```js
import { formatBytes, parseBytes } from "./index.mjs";

formatBytes(0);                          // "0 B"
formatBytes(512);                        // "512 B"
formatBytes(1024);                       // "1 KiB"   (trailing zero trimmed)
formatBytes(1536);                       // "1.5 KiB"
formatBytes(1048576);                    // "1 MiB"
formatBytes(1610612736, { decimals: 2 });// "1.5 GiB" (still trailing-zero-trimmed)
formatBytes(-1);                         // null      (fail-closed: negative)
formatBytes(1.5);                        // null      (fail-closed: non-integer)
formatBytes(NaN);                        // null      (fail-closed: non-finite)
formatBytes(1536, { decimals: -1 });     // null      (fail-closed: bad decimals)
formatBytes(1536, { decimals: 101 });    // null      (fail-closed: above toFixed's ceiling, no throw)
formatBytes(1024, null);                 // null      (fail-closed: malformed opts, no throw)

parseBytes("0 B");                       // 0
parseBytes("1 KiB");                     // 1024
parseBytes("1.5 KiB");                   // 1536
parseBytes("1 MiB");                     // 1048576
parseBytes("0.5 KiB");                   // null      (non-canonical: 512's form is "512 B")
parseBytes("2048 KiB");                  // null      (non-canonical: carries to "2 MiB")
parseBytes("0 PiB");                     // null      (non-canonical: zero's form is "0 B")
parseBytes("1 KB");                      // null      (fail-closed: SI, not IEC)
parseBytes("1024");                      // null      (fail-closed: unit required)
parseBytes("1.5 B");                     // null      (fail-closed: non-integer bytes)
parseBytes("8 PiB");                     // null      (fail-closed: 2**53, not a safe integer)
```

### `formatBytes(n, opts?) -> string | null`

Converts a non-negative finite integer byte count into a human-readable IEC
string.

| step | what it does |
| --- | --- |
| guard | non-Number / non-finite / negative / non-integer / **non-safe-integer** `n` -> `null`; `-0` normalized to `0` |
| guard | malformed `opts` (non-object: `null` / number / string / array / …) -> `null` |
| guard | invalid `opts.decimals` (negative / non-integer / non-finite / wrong-type / **above the `toFixed` ceiling of 100**) -> `null` |
| pick unit | divide by 1024 repeatedly to the largest unit with magnitude >= 1, **capped at PiB** (a value in or above the PiB range stays in PiB — no EiB is invented) |
| bytes | the `B` unit is **always a plain integer**, rendered with no decimal regardless of `decimals` |
| decimals | non-byte units render with at most `decimals` places (default `1`), **trailing zeros trimmed** — so `1024` -> `"1 KiB"`, not `"1.0 KiB"` |
| join | the number and unit joined by a single ASCII space |

**Options**

- `opts` must be an options object or be omitted. An omitted / `undefined` opts
  uses defaults; a **non-object** `opts` (`null`, a number, string, boolean,
  bigint, or array) is a malformed argument and fails closed to `null` — it is
  not a "use defaults" sentinel, and it **never throws** (a `null` opts does not
  reach a `.decimals` read).
- `decimals` (default `1`): the **maximum** decimal places for non-byte units, in
  the range **`[0, 100]`** (the `toFixed` ceiling). Trailing zeros are always
  trimmed, so this is a precision cap, not a fixed width:
  `formatBytes(1536, { decimals: 2 })` is `"1.5 KiB"`, not `"1.50 KiB"`. Bytes
  (`B`) are always integers and ignore this. Only a truly absent `decimals` (key
  omitted / `undefined`) uses the default — a present `null`, a value above `100`,
  or any non-integer is invalid and **fails closed** rather than throwing.

### `parseBytes(str) -> number | null`

The **true strict inverse**. It accepts `str` **iff** `str` is exactly the
string `formatBytes` emits (at default precision) for the byte count `str`
denotes — and returns that count. This is enforced by **canonicalization**, not
by trusting a grammar: after a cheap regex screen and a safe-integer-bytes check,
it recomputes `formatBytes(bytes)` and rejects unless that reproduces the input
verbatim. A superset leak is therefore **structurally impossible** — format's
image *is* the accepted language.

Consequences:

- A **unit token is required** (`"1024"` -> `null`).
- The byte count must be a **non-negative safe integer**: `"1.5 B"` -> `1.5`
  bytes (non-integer, `null`); `"8 PiB"` -> `2**53` (non-safe, `null`).
- **Every non-canonical spelling of a real count is rejected** in favour of its
  canonical form — `"0 KiB"`/`"0 PiB"` (canonical `"0 B"`), `"0.5 KiB"`
  (`"512 B"`), `"0.25 GiB"` (`"256 MiB"`), `"2048 KiB"` (`"2 MiB"`),
  `"1024 MiB"` (`"1 GiB"`), and non-canonical number spellings (`"01 KiB"`,
  `"1.50 KiB"`, `".5 KiB"`).
- A **lossy** format output is also rejected: `formatBytes(1048575)` is
  `"1024 KiB"`, but `parseBytes("1024 KiB")` would be `1048576` whose canonical
  form is `"1 MiB"` -> `null`. The round-trip identity holds on the lossless grid
  only (see below).
- Everything else fails closed to `null`: unknown units (`"1 KB"`, `"1 foo"`),
  missing number or unit, multiple units, whitespace/empty, wrong case
  (`"1 kib"`), and non-string input.
- It is **not** a lenient human-input or canonical-superset parser; rejecting
  those forms is the contract.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same output.
- **One shared domain** — both functions live on `[0, Number.MAX_SAFE_INTEGER]`.
  `formatBytes` rejects a non-safe-integer `n` rather than emit a string its own
  inverse could not trust, and `parseBytes` rejects a string whose byte count is
  non-safe. So `formatBytes(2**53) === null` and `parseBytes("8 PiB") === null`,
  symmetrically.
- **Fail-closed — and provably never throws** — both functions return `null` on
  bad input and never throw: `formatBytes` on non-Number / non-finite / negative
  / non-integer / non-safe-integer `n`, on a malformed `opts` (non-object, incl.
  `null`), and on a bad `decimals` (incl. one above the `toFixed` ceiling of 100);
  `parseBytes` on any string that is not the canonical default rendering of a
  safe-integer byte count. No hostile argument reaches a `.decimals` read on a
  non-object or a `toFixed` call with an out-of-range digit count, so the "never
  throws" acceptance property holds against the whole hostile-input grid.
- **Strict-inverse / no-superset (true)** — `parseBytes` accepts a string **iff**
  `formatBytes(parseBytes(str)) === str`. The accepted language is *exactly*
  format's image; there is no separate grammar to drift into a superset, so the
  bug class of accepting non-emitted forms cannot occur.
- **Round-trip law (honest)** — `parseBytes(formatBytes(n)) === n` holds for
  every `n` the format encodes **losslessly**: `0`, exact unit multiples at every
  scale, and clean fractions that land on a representable decimal grid
  (`1536` <-> `"1.5 KiB"`). The default one-decimal render **is lossy off that
  grid** (`formatBytes(1048575)` is `"1024 KiB"`), and those lossy strings are
  **format-direction-only** — `parseBytes` rejects them too, because they are not
  the canonical rendering of the count they would parse to. So
  `parse(format(x)) === x` is **not** promised for arbitrary `x` — only for the
  lossless grid, where format's output already is canonical.
- **Zero-dependency doctrine** — strictly stdlib (`Number.prototype.toFixed`, one
  static `RegExp`); no install, no build step. The test suite uses Node's
  built-in `node:test` + `node:assert/strict`, adding no dependency either.

## Test

From the repo root (zero deps):

```sh
npm test --prefix src/bytes
```

or from inside `src/bytes/`:

```sh
node --test
```

> Do **not** pass a bare directory to `node --test` (e.g. `node --test .`): on
> Node 24 that fails with `MODULE_NOT_FOUND`. Use bare `node --test`
> (auto-discovers `*.test.mjs`), an explicit glob, or an explicit file path.

All inputs/expectations live once in [`fixtures.mjs`](./fixtures.mjs); the suite
in [`index.test.mjs`](./index.test.mjs) is table-driven over the on-grid
round-trip, format-boundary, decimals-option, lossy-format, and fail-closed
(format, decimals, and parse) tables, plus purity and return-type guards.
