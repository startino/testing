# Meeting notes formatter

This command converts plain meeting notes into Markdown. The output contains
`Summary`, `Decisions`, and `Action Items` sections.

## Usage

Use Node.js 24 or later.

```sh
node tools/meeting-notes/meeting-notes.mjs notes.txt -o meeting.md
```

Omit `-o meeting.md` to write the Markdown to standard output.

Start a line with `Decision:`, `Decided:`, `We decided to`, `Action:`,
`Action item:`, `Todo:`, `Summary:`, or `Note:` to select a section. The command
puts unmarked lines in the summary. It also reads content below section headings.

Example input:

```text
Reviewed the launch plan and open risks.
Decision: Release on Friday after the final check.
Action: Mina - update the runbook by Thursday.
```
