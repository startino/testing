# Canonical transcript proof

A Station card is the top-level record for one piece of work. When Station
starts the card, it creates a root run and records the root agent's messages,
tool calls, and results in the card's canonical transcript.

Delegation stays inside that record. A child agent gets its own event stream,
linked to the root by the spawn event and its lineage path. When the child
finishes, Station delivers the child's result back to the root transcript. The
child is not a second card, and its work is not flattened into an unexplained
root message.

## Evidence from this card

This document was produced by testing card
`j570cn8na94ed3f1jpbaqwes5s8bj53r` in root run
`k578x3k7cykcn9wge6pry4fh3h8bjk3e`.

The root delegated one bounded, read-only inspection with this exact lineage:

```text
/root
└── /root/inspect_transcript_lineage
```

The child inspected the repository for local transcript or lineage data. It
reported that this repository contains none. That result matches the
repository's stated role: [`README.md`](../README.md) calls it a target sandbox,
and [`CONTRIBUTING.md`](../CONTRIBUTING.md) describes Station creating a Kanban
item before an agent performs the work.

The practical boundary is:

- The Station card records the root request, root activity, child spawn, child
  activity, child result, and later root activity.
- The testing repository records only durable project outputs, such as this
  document and the commit that adds it.
- Station's control plane, not the target repository, owns the canonical
  transcript and the parent-child links.

This separation lets a reviewer follow who did what without adding runtime
transcript files to the project.
