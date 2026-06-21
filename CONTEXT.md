# Testing Sandbox

The `testing` repo is a throwaway sandbox for Station to exercise itself against. Deliverables here follow the proven `src/unicode/` shape: self-contained, zero-dependency Node v24+ ESM modules. This document fixes the vocabulary of the sandbox's modules: the feature-flag system (so its terms are never confused with the Station product's own flag mechanism) and the `src/duration/` format/parse contract (so "inverse" and "round-trip" mean exactly one thing here).

## Language

### Feature flags

**feature flag (testing sandbox)**:
A fail-closed **boolean**, read once at process start via the zero-dependency `src/flags/` library, resolved by `process.env.FLAG_<NAME>` override > `FLAGS_ENV`-selected config default > `false`. Lives entirely in checked-in code plus a boot-time env override.
_Avoid_: "toggle", "kill switch", "config flag" (these blur into the product term below).

**Station product feature flag**:
A behavioral toggle for the Station *product*, which the platform doctrine requires to live in Convex tables (`projects` per-project, `orgs` per-org, singleton `appSettings`) gated by a permission and surfaced in the web UI. **Not** the same artifact as a sandbox feature flag, and the sandbox flag sets no precedent for it.
_Avoid_: conflating with "feature flag (testing sandbox)"; this one is never an env var.

**refresh model (sandbox flags)**:
None at runtime. There is no long-lived process and no deploy in this sandbox; re-invoking the fresh Node process is the only refresh path. "Without redeploying" means changing behavior via the boot-time `process.env` override without editing and committing the checked-in config.
_Avoid_: "hot-reload", "live reload", "watch" (explicitly rejected).
_Scope:_ "no deploy in this sandbox" applies to the zero-dep flags/module track only; the `web/` SvelteKit app added per ADR 0002 does deploy (to Railway on push to `alpha`).

**fail-closed (sandbox flags)**:
The default at every layer: unknown or typo'd flag => `false`; a non-truthy or garbage `FLAG_<NAME>` => `false`; a missing `FLAGS_ENV` key resolves all flags to `false` with no thrown exception.
_Avoid_: "fail-open", "default-on".

**FLAGS_ENV**:
The boot-time `process.env` variable selecting which named environment's defaults (a key in the checked-in `flags.config.mjs`, e.g. `test`/`dev`/`ci`) the library reads. A missing or unknown value is fail-closed (all flags `false`), never an error.

**FLAG_<NAME>**:
A boot-time `process.env` override for a single flag, layered above the `FLAGS_ENV` config default. Parsed fail-closed: only an explicit truthy token enables; anything else is `false`. This is the doctrine's sole sanctioned env path -- "test fixture switching modes via env var on fresh-process invocation."

### Duration format/parse (`src/duration/`)

**duration string**:
The compact human form `formatDuration` emits: `d`/`h`/`m`/`s` unit tokens largest-to-smallest, single-space-joined, zero leading/trailing units dropped, sub-second rendered as fractional seconds with one trailing-zero-trimmed decimal (e.g. `0s`, `1.5s`, `1m 30s`, `1h 1m 1s`). Only the seconds token may carry a decimal.
_Avoid_: "human-readable string", "formatted time" (too vague to pin the exact grammar).

**inverse (`src/duration/`)**:
The relationship `parseDuration` has to `formatDuration`: it is a **strict** inverse -- it accepts ONLY the duration-string grammar `formatDuration` emits and fails closed (`null`) on every other input (`1m30s`, `90s`, `1.5h`, `2 mins`, `1M`, reordered or repeated units). It is **not** a lenient human-input parser. A lenient superset, if ever needed, is a separate additive layer, never a widening of this term.
_Avoid_: "lenient parse", "human-duration parser", "forgiving" (the inverse is deliberately not forgiving).

**round-trip law (`src/duration/`)**:
The identity `parseDuration(formatDuration(ms)) === ms`, which holds **totally only on the output grid** -- the `ms` values `formatDuration` can emit exactly (whole d/h/m and seconds at one-decimal resolution). Off the grid the format step is lossy by design (`formatDuration(1250) === '1.3s'`, reparsing to `1300`; `1 -> '0s'`; `999 -> '1s'`), so the law is one-directional there. The suite asserts the identity only over on-grid fixtures and pins the lossy cases as documented format-direction behavior.
_Avoid_: claiming `parse(format(x)) === x` for arbitrary `x` (false off the grid).

**fail-closed (`src/duration/`)**:
Both functions return `null` rather than throwing on bad input: `formatDuration` on negative, `-0`, or non-finite `ms`; `parseDuration` on any string outside the strict duration-string grammar. The same fail-closed doctrine the flag library follows, applied at the format/parse boundary.
_Avoid_: "throws on bad input", "fail-open" (neither function throws; neither guesses).

## Relationships

- A **feature flag (testing sandbox)** is resolved by the `src/flags/` library from the **FLAGS_ENV**-selected config default, overridden by a matching **FLAG_<NAME>**, defaulting **fail-closed**.
- A **feature flag (testing sandbox)** is NOT a **Station product feature flag**: the former lives in checked-in code + a boot-time env override; the latter lives in Convex gated by a permission.
- The **refresh model (sandbox flags)** is "re-run the process" precisely because **FLAG_<NAME>** is read once at boot and there is no long-lived process to reload.
- `formatDuration` produces a **duration string**; `parseDuration` is its strict **inverse (`src/duration/`)**, accepting only that grammar.
- The **round-trip law (`src/duration/`)** binds the two: total on the output grid, lossy and one-directional off it.
- Both `src/duration/` functions are **fail-closed (`src/duration/`)** -- `null`, never a throw, on bad input.

## Example dialogue

> **Dev:** "We need to flag this experimental path on in CI. Do I add it to Convex `appSettings` like the product flags?"
> **Architect:** "No -- that is a **Station product feature flag**, and this sandbox has no Convex. Here a **feature flag (testing sandbox)** is a boolean in `flags.config.mjs` under the `ci` environment, read via `isEnabled`. To flip it for one run without committing, set **FLAG_<NAME>=1** -- that override is read once at process start."
> **Dev:** "What if I typo the flag name?"
> **Architect:** "It resolves **fail-closed** to `false`. An unknown flag never enables an experimental path -- same if **FLAGS_ENV** names an environment that isn't in the config: every flag is `false` and nothing throws."

## Flagged ambiguities

- "feature flag" was used to mean both the sandbox boolean and the Station product's Convex-backed toggle -- resolved: these are distinct artifacts. In this repo, an unqualified "feature flag" means **feature flag (testing sandbox)**; the product concept is always written out as **Station product feature flag**.
- "without redeploying" implied a running deployment that does not exist here -- resolved: it means changing behavior via the boot-time **FLAG_<NAME>** override without editing and committing the checked-in config; there is no deploy in this sandbox.
- "inverse" for `parseDuration` could mean either a strict reverse of `formatDuration`'s output or a forgiving human-duration parser -- resolved: in `src/duration/` **inverse (`src/duration/`)** is strict; non-emitted forms fail closed to `null`. A lenient parser would be a distinct additive layer, not this term widened.
- "round-trip" implied a symmetric `parse(format(x)) === x` for any `x` -- resolved: the **round-trip law (`src/duration/`)** is total only on the output grid; the one-decimal sub-second format is lossy off it, so the identity is one-directional there.
