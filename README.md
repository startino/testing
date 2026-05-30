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
