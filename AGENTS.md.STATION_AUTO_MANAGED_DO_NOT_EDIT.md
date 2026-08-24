# AUTO-MANAGED FILE — DO NOT EDIT IN PLACE

`AGENTS.md` in this directory is managed by the Station agent-rules syncer.
`CLAUDE.md` is a symlink to `AGENTS.md`, so the two cannot drift.

The Agent Rules Janitor source is `services/api/src/station/daemons/agent_rules_janitor.py`.
The loop operates inside the `station-api` systemd service. There is no separate
systemd unit for it.

The Agent Rules Janitor writes the block between `<!-- station-rules-start -->` and
`<!-- station-rules-end -->` from the Convex project-rules sections.

A disk edit to a project-scope section syncs up to Convex on the next tick.
A disk edit to a platform-scope or org-scope section does not. Station
overwrites it within seconds and records it in `projectRulesDroppedEdits`.

To change a rule reliably, edit it in the Station rules UI or with the
Station rules tools. Do not edit the managed block in this file.
