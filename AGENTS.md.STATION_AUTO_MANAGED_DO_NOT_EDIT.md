# AUTO-MANAGED FILE — DO NOT EDIT IN PLACE

`CLAUDE.md` and `AGENTS.md` in this directory are managed by the Station
`station-agent-rules-syncer` daemon (source:
`web/src/lib/server/agent-rules-syncer/syncer.ts`).

The daemon bidi-syncs these files with the Convex project-rules sections:
on-disk edits sync up on the next beacon tick, but any Convex-side change
will silently overwrite your local edit within seconds.

To change content reliably, edit through the Station UI rather than the
file directly.
