# Feature Flags (testing sandbox)

A pure, fail-closed, dependency-free library for **feature flags (testing
sandbox)**: booleans, read once at process start, resolved from a checked-in
config plus a boot-time `process.env` override.

> **Terminology guard (load-bearing).** In this repo an unqualified "feature
> flag" means a **feature flag (testing sandbox)**: the fail-closed boolean this
> library reads. It is **NOT** the **Station product feature flag** — the
> Convex-backed, permission-gated, UI-surfaced product toggle that the platform
> doctrine requires to live in `projects`/`orgs`/`appSettings`. They are distinct
> artifacts; the sandbox flag sets **no precedent** for the product flag. This
> distinction is fixed in [`../../CONTEXT.md`](../../CONTEXT.md) and the rationale
> for shipping a library (not a Convex backend) is in
> [`../../docs/adr/0001-feature-flags-as-zero-dep-library.md`](../../docs/adr/0001-feature-flags-as-zero-dep-library.md).
> Read both before changing this module.

## Runtime choice

**Node.js v24+, native ESM (`.mjs`), typed via JSDoc** — not TypeScript, not
Python, no build step. Zero runtime dependencies: Node stdlib + `process.env`
only. This mirrors the proven `src/unicode/` convention (own `package.json`,
`__tests__/`, `fixtures.mjs`, `node --test`). JSDoc gives the documented
signature with zero install. The `"type": "module"` field plus the `.mjs`
extension make ESM unambiguous. See ADR 0001 for why a library — not a
Convex + web UI backend — is the right shape in this sandbox.

## Public API (`flags.mjs`)

| Function | Signature | Behavior |
|---|---|---|
| `isEnabled` | `(name: string) => boolean` | Fail-closed: returns `true` only when the flag resolves on at boot; an unknown/typo'd flag, an unset/unknown `FLAGS_ENV`, or a non-string `name` all return `false`. Never throws. |

`isEnabled` is the module's **exactly one** public surface — no `ctx` arg, no
second function, and no multivariate / typed (string/number/enum) accessor.
Flags are **booleans only**. (A typed accessor could be layered additively later
without changing this signature, but is out of scope.)

Flag names are simple lowercase `[a-z0-9_]` identifiers. Keep names
uppercase-collision-safe: because the env-override key is `FLAG_` +
`name.toUpperCase()`, do not declare both `my_flag` and `myFlag`.

## Resolution contract (highest-wins precedence)

`isEnabled(name)` resolves against the **boot snapshot** captured once at module
evaluation, by this precedence:

1. **`process.env.FLAG_<NAME>` override (HIGHEST).** Env key = `FLAG_` +
   `name.toUpperCase()`. Parsed via an **explicit truthy allowlist** —
   `1`, `true`, `on`, `yes` (case-insensitive, trimmed). A truthy value enables
   the flag; **everything else** (`0`, `false`, `off`, `""`, whitespace, `2`,
   `maybe`, any garbage) is an explicit `false`. A *present* `FLAG_<NAME>` —
   truthy or not — is authoritative and **wins over the config default**, so
   `FLAG_X=0` deliberately force-offs a flag the config would enable. We never
   use `Boolean(value)` (`Boolean("false") === true` would be a **fail-open**
   bug). A truthy override enables a flag **even if it is declared in no config
   env** — the override is authoritative and does not require the flag to be
   pre-declared.
2. **`FLAGS_ENV`-selected config default (MIDDLE).** `process.env.FLAGS_ENV`
   selects a key in [`flags.config.mjs`](./flags.config.mjs). The flag's value in
   that env is used **iff it is the literal `true`**; a `false`, a missing flag
   key, or any non-`true` (author-error) value yields `false`. If `FLAGS_ENV` is
   unset, empty, or names a key absent from the config, this layer contributes
   nothing — **all flags fall through, and nothing ever throws**.
3. **Fail-closed `false` (FLOOR).** Unknown flag, no override, no matching env
   default => `false`.

**Fail-closed is total** (see `CONTEXT.md`, "fail-closed (sandbox flags)"): an
unknown/typo'd flag, a garbage `FLAG_<NAME>`, and a `FLAGS_ENV` naming an absent
env all resolve `false` with no thrown exception. An absent or mistyped flag can
never silently enable an experimental path.

### Read-once / refresh model

`flags.config.mjs` is a static `import` and `process.env` is read **exactly
once**, at module evaluation, into an immutable boot snapshot. There is **no**
runtime hot-reload, **no** `fs.watch`, **no** timers, **no** polling, **no** I/O
after load. The refresh model is "**re-run the process**" — the next fresh Node
invocation is the only refresh path (`CONTEXT.md`, "refresh model (sandbox
flags)"). "Per environment" = `FLAGS_ENV` picks a named env's defaults at boot;
"without redeploying" = flip behavior via a boot-time `FLAG_<NAME>` override
without editing and committing `flags.config.mjs` (editing + committing that file
**is** this sandbox's local equivalent of a redeploy).

### Doctrine exception for the `process.env` override

The platform doctrine keeps behavioral toggles out of env vars. The
`FLAG_<NAME>` / `FLAGS_ENV` layer here rests **strictly** on the doctrine's sole
named carve-out — *"test fixture switching modes via env var on fresh-process
invocation"* — because **this repo IS that fixture**. It introduces **no env
vars beyond `FLAGS_ENV` and `FLAG_<NAME>`** and is **not** a general env-var
behavioral toggle. A future reader who sees `process.env.FLAG_*` and reaches for
the "behavioral toggles must live in Convex" doctrine: the answer is here, and in
ADR 0001 / CONTEXT.md — it sets **no precedent** for the Station product feature
flag.

## Config (`flags.config.mjs`)

Shape `{ <envName>: { <flagName>: boolean } }`. The file ships named
environments (e.g. `test`, `dev`) whose flag objects supply the layer-2 defaults.
Values must be literal booleans; a non-boolean is treated as not-`true` =>
`false`. Editing and committing this file is the sandbox's "redeploy."

## Running the tests

From **inside `src/flags/`**:

```
node --test
```

or, from the repo root:

```
npm test --prefix src/flags
```

> Do **not** pass a bare directory to `node --test` (e.g.
> `node --test __tests__/`): on Node 24 that fails with `MODULE_NOT_FOUND`. Use
> bare `node --test` (auto-discovers `*.test.mjs`), an explicit glob, or an
> explicit file path.

### The `?bust=` test idiom

Because the module reads `process.env` once at boot, the suite must control the
boot environment per case. It does so by importing a **fresh** module instance —
`await import("../flags.mjs?bust=<n>")` with a monotonic counter — so the ESM
loader re-evaluates the module and re-snapshots `process.env`. Each case
set/restores the relevant `FLAGS_ENV` / `FLAG_*` keys around that fresh boot so
no test leaks env state. The config is a pure literal (value-identical across
instances); only the env read differs. Tests assert **external behavior only**
(the boolean `isEnabled` returns for a given config + boot-time env).

The seed constants the suite drives against are defined **once** in
[`fixtures.mjs`](./fixtures.mjs) and imported by the test — no copy-pasted
literals.
