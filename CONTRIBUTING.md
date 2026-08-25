# Contributing

This is a disposable **Station** sandbox: a deliberately throwaway project that
exists so Station can exercise its Prose programs (`fix`, `feature`, `test`,
`dod`, `report`, `explore`, `design`, `config`) end-to-end against a
real-but-expendable repo, instead of polluting Station's own Kanban board and git
history. Nothing here is precious — the repo itself stays, but its *contents* are
disposable. Treat [`README.md`](./README.md) and `.gitignore` as the stable
baseline; everything else is fair game to generate, mutate, or remove.

Two deliverable tracks have proven out here:

- **Zero-dependency Node modules** under `src/` (`src/bytes`, `src/duration`,
  `src/flags`, `src/slug`, `src/unicode`) — self-contained Node v24+ ESM modules,
  each with its own `package.json`, JSDoc types, and `node --test` tests (in a
  `__tests__/` dir or a colocated `*.test.mjs`). No build, no
  deploy (see [`docs/adr/0001`](./docs/adr/0001-feature-flags-as-zero-dep-library.md)).
- **A SvelteKit web app** under `web/` — SvelteKit + adapter-node, Tailwind v4,
  shadcn-svelte, which auto-deploys to Railway on push to `alpha`
  (see [`docs/adr/0002`](./docs/adr/0002-sveltekit-app-on-railway-alpha.md) and
  [`DEV.md`](./DEV.md)).

See [`README.md`](./README.md) for why the repo exists and
[`CONTEXT.md`](./CONTEXT.md) for the feature-flag and duration-format vocabulary.

## How work flows here

Work in this repo runs as a closed, machine-driven loop with **no human
interaction in the normal path**:

1. **Station creates a Kanban item** describing the work.
2. **An AI agent picks it up and implements it** — writing, editing, and deleting
   files, branching, committing, pushing, and opening a PR.
3. **The PR auto-merges** by **rebase-merge to `alpha`**. History here is linear
   and rebase-only: repo settings reject `--squash` and `--merge`, so use
   `gh pr merge <N> --rebase` (or the **Rebase and merge** button). `git pull`
   rebases by default — never reach for `--no-rebase` or `git merge`.
4. **Where the item landed product code under `web/`, the merge deploys** to
   Railway on push to `alpha`. The zero-dependency `src/` module tracks have no
   deploy — the fresh process is the refresh.

No human authors the code, reviews the PR, approves the merge, or stands by to
answer a mid-run question. That is the repo's operating **intent**: it is built
for and run as unattended autonomous development. An operator *can* seed items and
*can*, in principle, be reached through Station's `station_question` park
primitive — but an item that forces such a question stalls the unattended loop, so
items here are authored to need none.

## Conventions for item authors

Because no operator is available to clarify mid-run, the quality of an item is the
dominant factor in whether an unattended agent succeeds. When authoring an item:

- **Make it self-contained.** Carry everything the agent needs: acceptance
  criteria, target paths, and the expected shape of the deliverable. Ambiguity has
  no one to resolve it — it becomes a stalled or guessing agent.
- **Keep the scope bounded and verifiable.** Name the deliverable concretely and
  keep it small, with a check the agent can run to confirm it is done. A too-broad
  item is the failure mode: as it grows it accumulates the kind of judgment call no
  one is on hand to resolve, manufactures a mid-run operator question, and stalls
  the unattended loop (see "How work flows here" above). A tightly scoped item has
  nothing to ask about.
- **Respect the Station-managed files.** Never instruct hand-edits to `CLAUDE.md`,
  `AGENTS.md`, or their `*.STATION_AUTO_MANAGED_DO_NOT_EDIT.md` markers. These are bidi-synced with Station's Convex `agentDocs` table by the
  `station-agent-docs-syncer` daemon — edit them only through the Station UI, or
  the next sync clobbers the change.
- **Honor the conventions the agent will be bound by.** History is rebase-only.
  Env vars are reserved for real secrets and irreducible boot-time context — never
  feature flags or behavioral toggles: sandbox flags live in the `src/flags/`
  library (per [`CONTEXT.md`](./CONTEXT.md) / `docs/adr/0001`), and the Station
  *product*'s flags live in Convex — they are never the same artifact. Non-trivial
  durable decisions are recorded as ADRs.
- **Prefer the proven deliverable shapes.** A new module follows the
  `src/<name>/` shape — a self-contained, zero-dependency Node v24+ ESM module
  (own `package.json`, JSDoc-typed, `README.md`, tests run with `node --test`).
  The existing modules vary in layout: tests live either in a `__tests__/` dir or
  in a colocated `*.test.mjs` beside the source — match whichever an existing
  module nearby already uses rather than assuming one fixed file name. A new
  product surface goes in the `web/` SvelteKit app per `docs/adr/0002`.

## Build & test

- **Build:** none at the repo root. The `src/` modules need no compile step. Only
  the `web/` app has a build (`cd web && npm run build`).
- **Health check:** `npm run doctor` runs every gate that CI runs, plus the
  environment and layout checks. Use `npm run doctor -- --quick` for the fast
  static checks. See [`docs/QUICKSTART.md`](./docs/QUICKSTART.md).
- **Pulse:** `npm run pulse` prints the state of the checkout — branch, worktree,
  latest commit, manifests, and the verification commands. It reads local data
  only and never fails. Run it to orient yourself; run the doctor to know if the
  change is ready. See [`scripts/pulse.mjs`](./scripts/pulse.mjs).
- **Test:** `npm test` runs the whole suite through
  [`scripts/test-all.mjs`](./scripts/test-all.mjs). It discovers each `src/<name>/`
  module that declares a `test` script and runs the module with its own runner.
  It also runs the `web/` app tests. To test one module, use
  `npm test --prefix src/<name>`. Run the `web/` app with
  `cd web && npm install && npm run dev` (see [`DEV.md`](./DEV.md)).
- **Generated docs:** `npm run gen:docs` writes `src/README.md` and
  `npm run gen:catalog` writes `docs/CATALOG.md`. CI fails a change that leaves
  either file stale.

## More context

- [`docs/QUICKSTART.md`](./docs/QUICKSTART.md) — the 10-minute path for a new
  contributor: prerequisites, first commands, repository map, and the
  command-to-gate table.
- [`README.md`](./README.md) — why this repo exists.
- [`CONTEXT.md`](./CONTEXT.md) — feature-flag and duration-format vocabulary.
- [`CLAUDE.md`](./CLAUDE.md) — the full agent/contributor rationale.
- [`DEV.md`](./DEV.md) — running the `web/` app locally.
- [`docs/adr/`](./docs/adr/) — the decisions behind the two deliverable tracks.
