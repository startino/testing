# Testing Sandbox

The `testing` repo is a throwaway sandbox for Station to exercise itself against. Deliverables here follow the proven `src/unicode/` shape: self-contained, zero-dependency Node v24+ ESM modules. This document fixes the vocabulary of the sandbox's modules: the feature-flag system (so its terms are never confused with the Station product's own flag mechanism), the `src/duration/` format/parse contract (so "inverse" and "round-trip" mean exactly one thing here), and the `src/semver/` version contract (so "range", "precedence", and "fails closed" do too).

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

### Version parse/compare/satisfies (`src/semver/`)

**version string (`src/semver/`)**:
The strict [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) spelling `major.minor.patch[-prerelease][+build]` that `parse` accepts, and the only one it accepts. No `v` prefix (`v1.2.3` fails closed, unlike npm, which strips it), no surrounding whitespace (there is no trimming anywhere in the module), no partial version (`1.2`), and no leading zero in a core field or a numeric prerelease identifier. The grammar admits exactly one spelling per version, which is what makes `parse(v).version === v` exact.
_Avoid_: "version-ish string", "loose version", "npm-compatible parse" (the parse step is deliberately stricter than npm's).

**precedence (`src/semver/`)**:
The ordering `compare` implements, per SemVer §11: numeric on major/minor/patch, a prerelease ranking below its own release, and identifier-by-identifier prerelease comparison with numeric identifiers always ranking below alphanumeric ones. **Build metadata is excluded** (§10), so `1.2.3+a` and `1.2.3+b` have EQUAL precedence. `compare` is therefore a total order on precedence, NOT a test of string identity.
_Avoid_: "equal", "the same version" for a `compare` result of `0` (it means equal precedence, which two different strings can share).

**simple range (`src/semver/`)**:
The entire range language `satisfies` accepts: `[ "^" / "~" ] version`, where `version` is a full **version string (`src/semver/`)**. Exactly three forms -- exact, caret, tilde. Comparators (`>=1.2.3`), x-ranges (`1.2.x`, `*`), hyphen ranges, `||` unions, partial bases (`^1.2`), and whitespace-padded ranges are all OUTSIDE it and answer `false`. This is a stated contract, not an unfinished parser: a richer grammar, if ever needed, is a separate additive layer.
_Avoid_: "npm range", "semver range" unqualified (both imply the full npm grammar this deliberately does not implement).

**prerelease gate (`src/semver/`)**:
The rule that a version carrying a prerelease satisfies a **simple range (`src/semver/`)** only when the range's own version also carries a prerelease AND has the identical `major.minor.patch` tuple. So `1.2.3-alpha.2` satisfies `^1.2.3-alpha.1`, while `1.2.4-alpha.1` and `1.2.4-alpha` satisfy neither `^1.2.3-alpha.1` nor `^1.2.3`. Naming the exact core tuple in the range IS the opt-in; without the gate, `^1.2.3` would silently pull in `1.9.0-rc.1`.
_Avoid_: "prereleases are excluded" (they are not -- they are admitted only for the core version that named them).

**fail-closed (`src/semver/`)**:
The same doctrine as the flag and duration libraries, with one shape difference worth stating: `parse` and `compare` return `null`, but `satisfies` returns `false`. A boolean predicate has no third state in which to report "I could not read that", so an unreadable version, an unreadable range, and an unsupported range form all answer `false`. Nothing in the module throws, for any input.
_Avoid_: reading a `satisfies` result of `false` as "does not match" alone (it also covers "not understood" -- use `parse` to tell the two apart).

## Relationships

- A **feature flag (testing sandbox)** is resolved by the `src/flags/` library from the **FLAGS_ENV**-selected config default, overridden by a matching **FLAG_<NAME>**, defaulting **fail-closed**.
- A **feature flag (testing sandbox)** is NOT a **Station product feature flag**: the former lives in checked-in code + a boot-time env override; the latter lives in Convex gated by a permission.
- The **refresh model (sandbox flags)** is "re-run the process" precisely because **FLAG_<NAME>** is read once at boot and there is no long-lived process to reload.
- `formatDuration` produces a **duration string**; `parseDuration` is its strict **inverse (`src/duration/`)**, accepting only that grammar.
- The **round-trip law (`src/duration/`)** binds the two: total on the output grid, lossy and one-directional off it.
- Both `src/duration/` functions are **fail-closed (`src/duration/`)** -- `null`, never a throw, on bad input.
- `parse` reads a **version string (`src/semver/`)**; `compare` orders two of them by **precedence (`src/semver/`)**; `satisfies` tests one against a **simple range (`src/semver/`)**.
- A **simple range (`src/semver/`)** is built from a **version string (`src/semver/`)**, so every rejection `parse` makes is also a range rejection: `^v1.2.3` and `^1.2` are unsupported for the same reason `v1.2.3` and `1.2` are unparseable.
- The **prerelease gate (`src/semver/`)** is the one range rule that does not follow from **precedence (`src/semver/`)** alone: `1.2.4-alpha` sorts inside `>=1.2.3 <2.0.0` and is still excluded from `^1.2.3`.
- **fail-closed (`src/semver/`)** and **fail-closed (`src/duration/`)** are the same doctrine at different return types -- `null` where a value is expected, `false` where a predicate is.

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
- "semver range" implied the full npm range grammar -- resolved: in `src/semver/` the term is **simple range (`src/semver/`)** and covers exactly `^`, `~`, and an exact version. Comparators, x-ranges, hyphen ranges, and unions are outside it and answer `false`. Widening the language would be a separate additive layer, never this term stretched.
- `compare(a, b) === 0` was read as "same version" -- resolved: it means equal **precedence (`src/semver/`)**, and build metadata is excluded from precedence, so `1.2.3+a` and `1.2.3+b` compare equal while being different strings. String identity is a separate question from ordering.
- "fails closed" was read as "returns `null`" everywhere -- resolved: **fail-closed (`src/semver/`)** is `null` from `parse` and `compare` but `false` from `satisfies`, because a predicate has no third state. A `false` therefore means "does not match OR not understood"; call `parse` to separate them.
