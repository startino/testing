# duration

Pure, stateless, **zero-dependency** duration format/parse for Node v24+ (native
ESM, typed via JSDoc). Follows the self-contained module shape established by
[`src/unicode/`](../unicode/), [`src/slug/`](../slug/), and [`src/flags/`](../flags/)
and the `src/duration/` vocabulary fixed in [`CONTEXT.md`](../../CONTEXT.md).

`formatDuration` emits a compact human **duration string**; `parseDuration` is its
**strict inverse** — it accepts only the grammar `formatDuration` emits and fails
closed (`null`) on everything else.

## API

```js
import { formatDuration, parseDuration } from "./duration.mjs";

formatDuration(0);          // "0s"
formatDuration(1500);       // "1.5s"
formatDuration(90000);      // "1m 30s"
formatDuration(3661000);    // "1h 1m 1s"
formatDuration(86400000);   // "1d"
formatDuration(-1);         // null        (fail-closed: negative)
formatDuration(NaN);        // null        (fail-closed: non-finite)

parseDuration("0s");        // 0
parseDuration("1m 30s");    // 90000
parseDuration("1.5s");      // 1500
parseDuration("1h 1m 1s");  // 3661000
parseDuration("1m30s");     // null        (fail-closed: missing space)
parseDuration("90s");       // null        (fail-closed: overflowing seconds)
parseDuration("2 mins");    // null        (fail-closed: not the grammar)
```

### `formatDuration(ms, opts?) -> string | null`

Converts a non-negative finite integer millisecond count into a compact
duration string.

| step | what it does |
| --- | --- |
| guard | non-number / non-finite / negative / non-integer `ms` -> `null`; `-0` normalized to `0` |
| grid round | round `ms` to the nearest 100 ms (the one-decimal seconds resolution) so rounding carries correctly into larger units |
| decompose | split into `d` (86400000 ms), `h` (3600000 ms), `m` (60000 ms), `s` (1000 ms), largest-to-smallest |
| drop zeros | omit zero leading and trailing units; the all-zero total emits `"0s"` |
| seconds | render the seconds token with one decimal, trailing `.0` trimmed (`1.5s`, `1s`, `0.5s`); only the seconds token carries a decimal |
| join | surviving tokens joined by a single space |

**Options**

- `opts` is **reserved** for forward-compat — currently accepted and ignored. No
  options ship in this version.

### `parseDuration(str) -> number | null`

The strict inverse: parses exactly the grammar `formatDuration` emits and returns
the summed milliseconds.

- Accepts one or more space-joined tokens `<int>d <int>h <int>m <num>s`,
  largest-to-smallest, at most one of each; only the seconds token may carry a
  single decimal. Each unit is bounded to the range `formatDuration` can emit
  (days unbounded, hours `0..23`, minutes `0..59`, seconds `[0,60)`).
- Everything outside that grammar fails closed to `null`: missing spaces
  (`1m30s`), overflowing units (`90s`, `60m`, `24h`), fractional non-second units
  (`1.5h`), plural/worded units (`2 mins`), uppercase (`1M`), reordered or
  repeated units, leading/trailing/double spaces, and non-string input.
- It is **not** a lenient human-input parser; rejecting those forms is the point.

## Properties

- **Pure & stateless** — no I/O, no globals, no time/random. Same input, same output.
- **Fail-closed** — both functions return `null` on bad input and never throw:
  `formatDuration` on non-number / non-finite / negative / non-integer `ms`;
  `parseDuration` on any string outside the strict grammar.
- **Round-trip law (honest)** — `parseDuration(formatDuration(ms)) === ms` holds
  **totally only on the output grid**: whole d/h/m and seconds at one-decimal
  resolution. Off the grid the format step is **lossy by design** (one decimal),
  so `parse(format(x)) === x` is **not** promised for arbitrary `x`:
  `formatDuration(1) === "0s"`, `formatDuration(999) === "1s"`,
  `formatDuration(1250) === "1.3s"`. Those lossy cases are pinned as
  format-direction behavior, never smuggled into a false identity claim.

## Test

From the repo root (zero deps):

```sh
npm test --prefix src/duration
```

or from inside `src/duration/`:

```sh
node --test
```

> Do **not** pass a bare directory to `node --test` (e.g.
> `node --test __tests__/`): on Node 24 that fails with `MODULE_NOT_FOUND`. Use
> bare `node --test` (auto-discovers `*.test.mjs`), an explicit glob, or an
> explicit file path.

All inputs/expectations live once in [`fixtures.mjs`](./fixtures.mjs); the suite in
[`__tests__/duration.test.mjs`](./__tests__/duration.test.mjs) is table-driven over
the on-grid round-trip, format-boundary, lossy-format, and fail-closed (format &
parse) tables, plus purity and return-type guards.
