# parseDuration accepted strings formatDuration never emits (strict-inverse superset leak)

**Date:** 2026-06-21
**Symptom:** `parseDuration` accepted a family of leading-zero and explicit-`.0`
spellings that `formatDuration` provably never produces: `parseDuration("01s")
=== 1000`, `"05m" === 300000`, `"00m"`, `"1m 05s" === 65000`, `"1h 09m 05s"`,
`"1.0s" === 1000`, `"0.0s" === 0`, `"30.0s" === 30000`, `"00.0s" === 0`. This
made the parser a lenient SUPERSET of the emitted language, violating D1 (the
locked, load-bearing decision: strict inverse, no superset, everything else
fails closed to null). The module's own grammar header, README, and CONTEXT all
already described the strict language correctly -- only the regex disagreed.
**Affected:** `src/duration/duration.mjs:72` (the `DURATION_RE` literal — the
minute/second digit char classes and the seconds-decimal group)
**Root cause:** the regex char classes were laxer than the grammar they were meant
to encode. `([0-5]?\d)m` and `([0-5]?\d(?:\.\d)?)s`: the optional `[0-5]?` let a
`0` precede any digit (admitting `00`/`01`/`05`), and the `(?:\.\d)?` decimal group
had no exclusion of `.0` (admitting `1.0s`, `30.0s`). The hours alternation
`(2[0-3]|1\d|\d)h` already rejected leading-zero forms, so the parser was
inconsistently stricter on hours than on minutes/seconds -- strong evidence the
laxity was an unexamined side effect of the char-class choice, not a designed
allowance. Because `formatDuration` never emits these forms, the round-trip
identity still held, which is exactly why the leak was silent: it broke the
strict-inverse contract without breaking any test that only checked round-trip.

## Investigation
1. Surfaced by review (Linus, r1): a direct adversarial probe of `parseDuration`
   showed `01s`/`05m`/`1.0s`/`0.0s` and kin returning numbers, while an exhaustive
   ~900K-point format sweep confirmed `formatDuration` never emits a leading-zero
   or `.0` token. Accepted language != emitted language -> D1 superset.
2. Located the divergence at the regex char-class layer (the grammar header and
   docs were already faithful to D1; only the regex leaked). The fix had to be
   upstream, in the char classes, not a post-parse filter.
3. Non-blocker confirmed and preserved: zero-count tokens `0m`/`0h`/`0d` were a
   documented, on-the-record decision to accept (well-formed `<int>` tokens;
   format never emits them; round-trip unaffected) -- NOT part of this leak. The
   fix had to kill leading-zero spellings and `.0` WITHOUT regressing bare `0s`
   (the canonical zero output) or the zero-count tokens.

## Fix
Tightened `DURATION_RE` so the accepted language equals the emitted language:
- No leading zeros on any count: days `[1-9]\d*|0`, minutes and seconds-integer
  `[1-5]\d|\d` (mirroring what hours `2[0-3]|1\d|\d` already did). A count is `0`
  alone or a non-zero-led natural number.
- Seconds decimal is a true fraction only, `(\.[1-9])?` -- never `.0`, never two
  digits. Captured as a separate group from the seconds integer and recombined
  for the sum (`Number(s + (sDec ?? ""))`).
Only the regex (and the seconds destructure) moved; the grammar header, README,
and CONTEXT needed no change because they already specified the strict language.
Added the leak class (`01s`, `05m`, `00m`, `1m 05s`, `1h 09m 05s`, `1.0s`,
`0.0s`, `30.0s`, `00.0s`) to the `BAD_PARSE` fixture to lock it. Verified:
leak closed, every valid grammar string still parses exactly, bare `0s` still
-> 0, zero-count tokens still accepted, full on-grid round-trip identity intact.

**Commit:** `1d82352`
