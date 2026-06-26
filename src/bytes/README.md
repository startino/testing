# bytes

Pure, stateless, **zero-dependency** IEC byte-count format/parse for Node v24+
(native ESM, typed via JSDoc). Follows the self-contained module shape
established by [`src/unicode/`](../unicode/), [`src/slug/`](../slug/),
[`src/flags/`](../flags/), and [`src/duration/`](../duration/).

`formatBytes` emits a human-readable **IEC byte string** (base 1024 units `B`,
`KiB`, `MiB`, `GiB`, `TiB`, `PiB`); `parseBytes` is its **strict inverse** — it
accepts only the grammar `formatBytes` emits and fails closed (`null`) on
everything else.

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

parseBytes("0 B");                       // 0
parseBytes("1 KiB");                     // 1024
parseBytes("1.5 KiB");                   // 1536
parseBytes("1 MiB");                     // 1048576
parseBytes("0.5 KiB");                   // 512
parseBytes("1 KB");                      // null      (fail-closed: SI, not IEC)
parseBytes("1024");                      // null      (fail-closed: unit required)
parseBytes("1.5 B");                     // null      (fail-closed: non-integer bytes)
```

### `formatBytes(n, opts?) -> string | null`

Converts a non-negative finite integer byte count into a human-readable IEC
string.

| step | what it does |
| --- | --- |
| guard | non-Number / non-finite / negative / non-integer `n` -> `null`; `-0` normalized to `0` |
| guard | invalid `opts.decimals` (negative / non-integer / non-finite / wrong-type) -> `null` |
| pick unit | divide by 1024 repeatedly to the largest unit with magnitude >= 1, **capped at PiB** (a value in or above the PiB range stays in PiB — no EiB is invented) |
| bytes | the `B` unit is **always a plain integer**, rendered with no decimal regardless of `decimals` |
| decimals | non-byte units render with at most `decimals` places (default `1`), **trailing zeros trimmed** — so `1024` -> `"1 KiB"`, not `"1.0 KiB"` |
| join | the number and unit joined by a single ASCII space |

**Options**

- `decimals` (default `1`): the **maximum** decimal places for non-byte units.
  Trailing zeros are always trimmed, so this is a precision cap, not a fixed
  width: `formatBytes(1536, { decimals: 2 })` is `"1.5 KiB"`, not `"1.50 KiB"`.
  Bytes (`B`) are always integers and ignore this. Only a truly absent
  `decimals` (key omitted / `undefined`) uses the default — a present `null` is
  a wrong-type value and fails closed.

### `parseBytes(str) -> number | null`

The strict inverse: parses exactly the grammar `formatBytes` emits and returns
the integer byte count.

- Accepts `<number> <UNIT>` — a non-negative decimal number, **one** ASCII
  space, then one IEC unit token (`B`, `KiB`, `MiB`, `GiB`, `TiB`, `PiB`). The
  number is canonical: no leading zeros, no trailing-zero fraction, no leading or
  trailing dot, no sign, no exponent (the forms `formatBytes` never emits).
- A **unit token is required**. A bare number with no unit (`"1024"`) is **not**
  part of the grammar, so it fails closed — this keeps `parseBytes` a clean
  strict inverse of `formatBytes`, which always emits a unit.
- The computed byte count must be a **true integer**: `"0.5 KiB"` is `512` (an
  integer, accepted), but `"1.5 B"` is `1.5` bytes (not an integer, `null`).
- Everything else fails closed to `null`: unknown units (`"1 KB"`, `"1 foo"`),
  missing number or unit, multiple units, whitespace/empty, wrong case
  (`"1 kib"`), and non-string input.
- It is **not** a lenient human-input parser; rejecting those forms is the point.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same output.
- **Fail-closed** — both functions return `null` on bad input and never throw:
  `formatBytes` on non-Number / non-finite / negative / non-integer `n` (and bad
  `decimals`); `parseBytes` on any string outside the strict grammar.
- **Round-trip law (honest)** — `parseBytes(formatBytes(n)) === n` holds for
  every `n` the format encodes **losslessly**: `0`, exact unit multiples at every
  scale, and clean fractions that land on a representable decimal grid
  (`1536` <-> `"1.5 KiB"`). The default one-decimal render **is lossy off that
  grid** (`formatBytes(1048575)` is `"1024 KiB"`, which reparses to `1048576`),
  so `parse(format(x)) === x` is **not** promised for arbitrary `x` — only for
  the grid the format encodes exactly. Those lossy cases are pinned as
  format-direction behavior, never smuggled into a false identity claim.
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
