# Task count

Task count reads a plain-text checklist and prints the number of complete,
incomplete, and total tasks. It requires Node.js 24 or later and has no package
dependencies.

Write each task as `[x]` for complete or `[ ]` for incomplete. Uppercase `[X]`
also means complete. A task can start with a Markdown bullet. Blank lines,
headings, and other text are ignored.

```text
# Launch checklist

- [x] Confirm the release tag
- [ ] Publish the package
[X] Notify the support team
```

Pass a file path:

```sh
node tools/task-count/task-count.mjs tasks.txt
```

Or pipe the list through standard input:

```sh
printf '[x] Write code\n[ ] Ship code\n' | node tools/task-count/task-count.mjs -
```

The output is suitable for people or simple shell scripts:

```text
Complete: 1
Incomplete: 1
Total: 2
```
