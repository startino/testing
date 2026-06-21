# formatDuration emitted off-grammar "60s" from sub-second rounding carry

**Date:** 2026-06-21
**Symptom:** `formatDuration(899953)` returned `"14m 60s"` instead of `"15m"`. The
emitted seconds token reached `60`, a value that overflows its unit and that the
module's own strict `parseDuration` correctly rejects (`parseDuration("14m 60s")
=== null`) -- so the format step produced a string outside the grammar it
promises, breaking the grid-fixpoint invariant `formatDuration(parseDuration(f))
=== f`.
**Affected:** `src/duration/duration.mjs:102` (the `formatDuration` round-to-grid
step, formerly the decompose-then-round ordering)
**Root cause:** the seconds component was rounded to one decimal place AFTER the
integer d/h/m components were already taken. `899953 ms` -> `minutes = floor(899953
/ 60000) = 14`, remainder `59953 ms` -> `seconds = 59.953` -> `toFixed(1)` rounds
UP to `"60.0"` -> `"60"`. The rounding carry from `59.95x` up to `60.0` had nowhere
to propagate because minutes had already been finalized. Classic round-then-carry
ordering bug.

## Investigation
1. Built the format/parse pair, then ran an exhaustive sweep asserting (a) no
   emitted string contains an off-grammar `60s`/`60m`/`24h` substring and (b)
   every emitted string reparses to a grid fixpoint. The sweep surfaced ~545
   failures, all of the form `Nm 60s` (and the analogous `Nh 60m` near hour
   boundaries) for ms values whose sub-second remainder rounded up across 60.
2. Confirmed it was a format-side bug, not a parse-side one: `parseDuration`
   rightly rejected `"14m 60s"` (seconds bounded to `[0,60)`), so the parser was
   correct and the formatter was emitting a string no valid input could produce.
3. Dead end considered and rejected: special-casing "if seconds rounds to 60,
   set seconds=0 and minutes+=1, then re-check minutes==60, then hours..." -- a
   manual carry cascade is fragile and has to be repeated at every unit boundary
   (minute->hour->day). Rejected for a single clean fix.

## Fix
Round the whole `ms` to the display grid (nearest 100 ms = the one-decimal
seconds resolution) ONCE, BEFORE decomposing, then decompose the rounded value:
`const gridMs = Math.round(ms / 100) * 100;`. Because `gridMs % 60000 < 60000`
always, the seconds remainder is a multiple of `0.1` strictly below `60`, so
`toFixed(1)` is exact and can never produce `"60.0"`; any carry has already been
absorbed into the larger units by the single up-front rounding. The documented
lossy boundary cases (`1 -> "0s"`, `999 -> "1s"`, `1250 -> "1.3s"`, `149 ->
"0.1s"`) are preserved by this rounding, and the exhaustive sweep (no off-grammar
emit, every emit a grid fixpoint, every 100 ms multiple round-trips exactly) is
clean.

**Commit:** `cc9b10d`
