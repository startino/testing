# testing

A throwaway sandbox repo for **Station** — the autonomous engineering platform
being developed at [`/shared/station`](https://github.com/startino) — to
exercise itself against during development.

## Why this repo exists

Station runs Prose programs (`fix`, `feature`, `test`, `dod`, …) that create
Kanban items, write code, open PRs, and push commits. Until now it has been
doing all of that against its own repo (`/shared/station`), which clutters
Station's real Kanban board with throwaway test items.

This repo is the dedicated target instead. Station has **full freedom** here:

- create as many Kanban items as it wants
- create, edit, and delete files
- branch, commit, push, and open PRs
- run any of its programs end-to-end

Nothing here is precious. If it breaks, it gets fixed or wiped. The point is
to have a realistic project to test against without polluting Station's own
board or history.

## Autonomous sandbox workflow

This is an **autonomous sandbox**: the work here is driven end-to-end by
Station's AI, with no human in the loop.

- **Purpose** — give Station a safe place to run a full task lifecycle —
  plan, implement, commit, open a PR, and ship — exactly as it would on a
  real project, but where mistakes are cheap and nothing is precious.
- **Ownership** — Station AI owns this project. It picks up Kanban items,
  decides how to implement them, and lands the work itself. There is no human
  reviewer gating each change; the operator sets direction, the AI executes.
- **Auto-merge policy** — because the AI owns the repo, work is shipped
  autonomously: once a PR's checks pass it is auto-merged onto `alpha`
  (rebase-and-merge only — see [`CLAUDE.md`](./CLAUDE.md) for the linear-history
  rule), with no manual approval step. Auto-merge is enabled on the PR as soon
  as it is opened so a green build flows straight to `alpha`.

## Testing & CI

The repo is a monorepo of small zero-dependency modules under `src/` (each with
its own tests) plus a SvelteKit `web/` app. A single command runs the whole
`src/` suite:

```sh
npm test
```

That invokes [`scripts/test-all.mjs`](./scripts/test-all.mjs) — a zero-dependency
Node runner that discovers every `src/<module>/` with a `test` script and runs
each module with its *own* declared runner (both `node --test` and `vitest`
modules are honoured; a module whose deps fail to install is reported as a
failure, never silently skipped).

CI runs the same command on every pull request and on pushes to `alpha` via
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml). This is the gate the
auto-merge policy above depends on: a PR only reaches `alpha` once the suite is
green. See [`docs/ci-notes.md`](./docs/ci-notes.md) for details.

## Library catalog

Every `src/` library is indexed in **[`docs/CATALOG.md`](./docs/CATALOG.md)** —
a generated table of each module's description, entry point, and test command.
It is produced from the modules on disk by
[`scripts/gen-catalog.mjs`](./scripts/gen-catalog.mjs) and drift-guarded in CI
(`node scripts/gen-catalog.mjs --check`), so it can never silently fall out of
date as libraries are added or renamed.

## What's *not* throwaway

The repo itself stays — only its *contents* are disposable. Treat
`README.md` and `.gitignore` as the stable baseline; everything else is fair
game for Station to generate, mutate, or remove.

## Station-managed files

`CLAUDE.md` and `AGENTS.md` are bidi-synced with Station's Convex `agentDocs`
table by the `station-agent-docs-syncer` daemon. Do not hand-edit them — edit
through the Station UI. The `*.STATION_AUTO_MANAGED_DO_NOT_EDIT.md` marker
files document this.

- 2026-05-30: Tab-2 concurrent plan-creation smoke test — a new plan was created from Tab 2 (run `k57c8afm8g98rnhzbpv93x7g4187qcgs`) while Tab 1 watched the Planning board; Tab 1 reflected the new plan live, without a manual refresh.
