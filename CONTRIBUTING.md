# Contributing

This is a disposable **Station** sandbox: a deliberately throwaway project that
exists so Station can exercise its Prose programs (`fix`, `feature`, `test`,
`dod`, …) end-to-end against a real-but-expendable repo. Contributions here are
predominantly machine-generated — Station creates Kanban items, writes code,
opens PRs, and pushes commits as part of its own development loop. Nothing in
here is precious. One thing is off-limits to hand edits, though: the
Station-managed files (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`, and their
`*.STATION_AUTO_MANAGED_DO_NOT_EDIT.md` marker files) are bidi-synced with
Station's Convex backend. Edit them only through the Station UI — never by hand,
or your change will be clobbered by the next sync.

## Build & test commands

- **Build:** none — there is no compile or build step in this repo (no
  `package.json`, `Makefile`, `pyproject.toml`, or any other build system).
- **Test:** there is no local test harness to invoke. "Testing" here means
  Station running its Prose programs (`fix`, `feature`, `test`, `dod`, …)
  end-to-end against the repo — that *is* the test.
- **Contributing changes:** history is linear and rebase-only. Merge a PR with
  `gh pr merge <N> --rebase` (or the **Rebase and merge** button in the UI).
  `--squash` and `--merge` are rejected by repo settings. `git pull` rebases by
  default — never reach for `--no-rebase` or `git merge`.

## More context

See [`README.md`](./README.md) for why this repo exists, and
[`CLAUDE.md`](./CLAUDE.md) for the full agent/contributor rationale.
