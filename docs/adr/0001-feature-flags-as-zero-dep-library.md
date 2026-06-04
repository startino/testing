# Feature flags in the testing sandbox ship as a zero-dep ESM library, not a Convex-backed product flag

**Status:** accepted

In the `testing` sandbox we needed a way to toggle experimental features per environment "without redeploying" and to "read a flag from application code." We decided to ship this as a standalone, zero-dependency Node v24+ ESM library at `src/flags/`, mirroring the proven `src/unicode/` convention. Flags are **booleans only, fail-closed** (an unknown or typo'd flag resolves to `false`). Values are **read once at process start with no runtime hot-reload**: a flag consumer is a fresh Node process, so the next invocation IS the refresh. Resolution precedence at boot is `process.env.FLAG_<NAME>` (parsed fail-closed: only an explicit truthy token enables) > the `FLAGS_ENV`-selected environment's config default (a missing `FLAGS_ENV` key resolves all flags to `false` and never throws) > `false`. The `process.env` override layer is justified **strictly** as the platform doctrine's sole named exception -- "test fixture switching modes via env var on fresh-process invocation" -- because this repo IS that test fixture; it is **not** a general env-var behavioral toggle.

## Context

The request under-determined the host (there is no application in this repo to "read a flag from"), but the framing settled the direction unambiguously once grounded against three facts:

1. **Proven convention.** The only deliverable shape this repo has ever shipped is the self-contained `src/unicode/` module (own `package.json`, JSDoc-typed -- not TypeScript, `node --test`, `__tests__/`, `fixtures.mjs`, `README.md`, zero deps, Node v24+ ESM). It has merged to `alpha`. A feature-flag library at `src/flags/` is the same shape applied to a new concern -- the lowest-risk, most legible choice.
2. **"Simple."** The request explicitly asks for simple. Standing up Convex + a web UI to back a few booleans in a throwaway sandbox is the single most expensive thing we could build, and it presumes a frontend stack that does not exist here.
3. **Doctrine has nowhere to live.** The platform doctrine that mandates Convex-backed flags is a doctrine for the *Station product*, hosted on a stack that is physically absent in this sandbox: no Convex, no `orgs`/`projects`/`appSettings`, no permission system, no UI. The doctrine's preconditions do not exist here, so the library does not violate it.

The refresh model was grounded on a fourth fact: **there is no long-lived process and no deploy in this sandbox.** No build, no CI deploy, no server, no daemon. A consumer boots, imports `src/flags/`, calls `isEnabled(name)`, and exits in seconds. The fresh process is the refresh; "per environment" = at boot, `FLAGS_ENV` selects a named environment's defaults from the checked-in config; "without redeploying" = change behavior via the boot-time `process.env` override without editing and committing that config (editing the checked-in config IS the local equivalent of a redeploy).

## Considered options

- **Convex + web UI backend (the product doctrine path) -- rejected.** Contradicts "simple"; presumes a Convex/orgs/projects/appSettings/permission stack that is absent; enormous effort wasted on a disposable sandbox. The doctrine's preconditions do not exist here.
- **Scaffold a host app / framework to give "application code" a home -- rejected.** The stakeholder named no framework. Picking one is an unrequested architecture decision, and a library needs no host to be tested -- the `node --test` harness is the first consumer.
- **Runtime hot-reload / external or remote flag source -- rejected.** Solves a problem that does not exist: processes here live seconds and exit, so the next invocation already re-reads everything. `fs.watch`/polling injects statefulness, timers, watchers, and nondeterminism (flaky races, leaked handles) into `node --test`, breaking the pure/stateless convention and contradicting "simple." Additive later if a long-lived consumer ever appears.
- **Multivariate / typed flag values (string/number/enum) -- rejected for now.** The request says "toggle on and off" -- boolean by plain reading. Multivariate adds a typed-accessor surface, value coercion, and per-type fail-closed semantics for zero requested benefit. A typed accessor can be layered additively later without touching `isEnabled`, so deferring costs nothing.

## Consequences

- The env-override layer rests entirely on the doctrine's one carved-out exception. If a future reader sees `process.env.FLAG_*` and reaches for the "behavioral toggles must live in Convex" doctrine, the answer is here: this repo IS the named test fixture, and the override is read on fresh-process invocation. It sets **no precedent** for Station-product feature flags, which must still live in Convex (`projects`/`orgs`/`appSettings`) gated by a permission.
- Fail-closed is total and load-bearing: unknown flag => `false`; non-truthy/garbage `FLAG_<NAME>` => `false`; missing `FLAGS_ENV` key => all flags `false` with no thrown exception. An absent or typo'd flag must never silently enable an experimental path.
- The read API stays a pure function of `(config, env-at-boot)` -- deterministic, trivially testable, zero deps -- preserving the convention `src/unicode/` established.
