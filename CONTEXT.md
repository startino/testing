# Testing Sandbox

The `testing` repo is a throwaway sandbox for Station to exercise itself against. Deliverables here follow the proven `src/unicode/` shape: self-contained, zero-dependency Node v24+ ESM modules. This document fixes the vocabulary around the feature-flag system so its terms are never confused with the Station product's own flag mechanism.

## Language

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

## Relationships

- A **feature flag (testing sandbox)** is resolved by the `src/flags/` library from the **FLAGS_ENV**-selected config default, overridden by a matching **FLAG_<NAME>**, defaulting **fail-closed**.
- A **feature flag (testing sandbox)** is NOT a **Station product feature flag**: the former lives in checked-in code + a boot-time env override; the latter lives in Convex gated by a permission.
- The **refresh model (sandbox flags)** is "re-run the process" precisely because **FLAG_<NAME>** is read once at boot and there is no long-lived process to reload.

## Example dialogue

> **Dev:** "We need to flag this experimental path on in CI. Do I add it to Convex `appSettings` like the product flags?"
> **Architect:** "No -- that is a **Station product feature flag**, and this sandbox has no Convex. Here a **feature flag (testing sandbox)** is a boolean in `flags.config.mjs` under the `ci` environment, read via `isEnabled`. To flip it for one run without committing, set **FLAG_<NAME>=1** -- that override is read once at process start."
> **Dev:** "What if I typo the flag name?"
> **Architect:** "It resolves **fail-closed** to `false`. An unknown flag never enables an experimental path -- same if **FLAGS_ENV** names an environment that isn't in the config: every flag is `false` and nothing throws."

## Flagged ambiguities

- "feature flag" was used to mean both the sandbox boolean and the Station product's Convex-backed toggle -- resolved: these are distinct artifacts. In this repo, an unqualified "feature flag" means **feature flag (testing sandbox)**; the product concept is always written out as **Station product feature flag**.
- "without redeploying" implied a running deployment that does not exist here -- resolved: it means changing behavior via the boot-time **FLAG_<NAME>** override without editing and committing the checked-in config; there is no deploy in this sandbox.
