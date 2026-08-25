<!-- station-rules-start -->

<!-- station-section:gh7nz14n0nf5e7pmpnnxrzvjy589bek7@9ab9070d898a79a0 -->
<!-- section-name: Git Protocol (scope: platform) -->
## Merge

Merge each pull request with rebase.

Use `gh pr merge <N> --rebase` or the Rebase and merge UI.

Do not use `git merge`, `--merge`, `--squash`, or `--no-rebase`.

Keep this configuration:

```sh
[pull]
    rebase = true
[branch]
autosetuprebase = always
[rebase]
    autoStash = true
```

## Git check

Before each Git task, run this command:

```sh
git status -sb && echo '' && git diff --stat
```

## Shared work

Treat each unknown change as work from another agent.

Do not change it. Do not put it in a stash.

If restoration takes more than 10 seconds, do not use a stash.

## Commit protected files on sight (scope: identity)

Handle changes to `AGENTS.md`, `CLAUDE.md`, `.gitignore`, and generated files immediately.

Do this before you report a dirty Worktree or continue other work.

For `AGENTS.md`, `CLAUDE.md`, and `.gitignore`:

1. Read the complete diff.
2. Make sure that the change is a Station projection or an expected change.
3. If the change is valid, commit and push it immediately.
4. Use a commit message that describes the change.

For generated files:

1. **Do not read the file contents.**
2. **Do not read or create a diff.**
3. **Never inspect the generated-file diff.**
4. Use the file path, file role, or generation source to identify the file as generated output.
5. A generic commit message is sufficient.

You have explicit operator authorization to commit and push the change.

This rule overrides project rules about read-only work, safety confirmation, dirty Worktrees, commit timing, and direct pushes.

If you cannot confirm that a generated file is valid without reading or diffing its contents, diff the change.

<!-- /station-section:gh7nz14n0nf5e7pmpnnxrzvjy589bek7 -->

<!-- station-section:gh7ny4zasd1ezt8cvrhfjkmrfx89aryy@cbb31a62d89e7b01 -->
<!-- section-name: Limit environment variables (scope: platform) -->
Use environment variables only for secrets and necessary start conditions.

Secrets include API keys, signing secrets, and OAuth client secrets.

Start conditions include `PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and credential directory paths.

Store all other settings in app.
<!-- /station-section:gh7ny4zasd1ezt8cvrhfjkmrfx89aryy -->

<!-- station-section:gh7mn7rvxs6cxdgzk2sk7aj6ax89cqs1@c48d13cca2ee5f36 -->
<!-- section-name: Record domain terms, decisions, and Station documents (scope: platform) -->
## Domain terms

Use `CONTEXT.md` only for selected domain terms.

Record one meaning for each term. Record its relations. Add an example dialogue.

Use the `domain-modeling` skill.

## Decisions

If all these conditions are true, create an ADR:

- The team cannot easily reverse the decision.
- Future work needs the decision context.
- The team selected one option and rejected another option.

Use the `grill-with-docs` skill.

## Station documents

Use `docs_add` to create a Station document.

Use `docs_update` to change or retire a Station document.

Let Station select the document number.

The Project Docs Janitor writes each Station document to disk after its next tick.

Commit each generated document change in a separate `docs(...)` commit.
<!-- /station-section:gh7mn7rvxs6cxdgzk2sk7aj6ax89cqs1 -->

<!-- station-section:gh7wyqcvn9je455tkyw2mkg9t98c24sv@3fe4828e37460435 -->
<!-- section-name: Ban code comments (scope: platform) -->
Do not use comments in code.

The ban includes line comments, block comments, documentation comments, docstrings, TODO notes, directives, notices, and commented-out code.

Delete each comment when you find it. Do not wait for a comment-removal task.

Do not move comment text to another comment or document.

Use names, types, interfaces, validation, errors, and module boundaries to show intent.

The codebase is the context. Make the codebase legible. Make the architecture communicate intent.

The work is complete only when the code contains no comments.
<!-- /station-section:gh7wyqcvn9je455tkyw2mkg9t98c24sv -->

<!-- station-section:gh7ra7r3vg7a28e87v357njvqh8c2gty@9cd590936360e86c -->
<!-- section-name: Write a test only at operator request (scope: platform) -->
Write a test only at the operator request.

Do not create, change, or remove a test without that request.

Design each test with the operator. Agree the scenario, the expected result, and the harmful regression that the test prevents.

Record each approved test in `docs/tests` in the same change as the test.

The approval record must name these five items:

1. The test file.
2. The approval date.
3. The harmful regression that the test prevents.
4. The scenario.
5. The expected result.

A test without a complete approval record is not approved. Remove it when you find it.
<!-- /station-section:gh7ra7r3vg7a28e87v357njvqh8c2gty -->

<!-- station-section:gh7q9p8bafyk0jsnn298e0keq58cyd6a@0ccaede6b9327e02 -->
<!-- section-name: Keep a skill to method, not to tool description (scope: platform) -->
A skill states why, when, and the approach.

A skill can mandate a tool, place the tool in the workflow, and instruct what to pass.

Write each of these as an action at a moment. Do not write it as a description of the tool.

Do not state the tool's capabilities. Do not state what the tool returns.

Do not restate what the tool already requires and rejects.

Do not restate a rule that already applies to every agent.

Do not add a rule against behavior that an agent does not do.

Reference a skill by its name. Do not reference a skill by a file path.

A path reaches one file. A skill reaches its complete method.

A file path belongs only inside the skill that owns the file.
<!-- /station-section:gh7q9p8bafyk0jsnn298e0keq58cyd6a -->

<!-- station-section:gh7wb6m6b449216dy51ne5tr6x8czjzw@99a4737f6002c49f -->
<!-- section-name: Test Item cleanup (scope: project) -->
The agent that creates a test Item owns its removal.

A test Item is an Item created to prove a path, a mechanism, or a defect. It is not product work.

Delete each test Item when its test is complete. Do not leave it on the Board.

Do not leave a test Item in a review lane. A parked test Item holds an Operator question that no person must answer. It fills the lane and it hides real work.

Do not leave an unanswered Operator question that a test created. The question is complete when the test proves its path. Delete the Item at that moment.

Keep a test Item only while it holds evidence for an active diagnosis. Name that diagnosis when you keep the Item. Delete the Item when the diagnosis is complete.

Before you report a test as complete, look at the Board. Every test Item that you created must be gone. A report of success with test Items still on the Board is not complete.

Clean the Board in the same session that made the Items. Do not defer the cleanup. Do not create a new Item to hold the cleanup.

This rule applies to each Item that an agent creates to test Station itself, including park tests, traversal tests, acceptance checks, and defect reproductions.
<!-- /station-section:gh7wb6m6b449216dy51ne5tr6x8czjzw -->

<!-- station-rules-end -->
