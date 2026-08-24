<!-- station-rules-start -->

<!-- station-section:gh7nz14n0nf5e7pmpnnxrzvjy589bek7@a3012e33d51c5edb -->
<!-- section-name: Merge with rebase, check Git state, and protect shared work (scope: platform) -->
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

When these files change, commit them:

- `CLAUDE.md`
- `AGENTS.md`
- `.gitignore`
- Generated files
<!-- /station-section:gh7nz14n0nf5e7pmpnnxrzvjy589bek7 -->

<!-- station-section:gh7ny4zasd1ezt8cvrhfjkmrfx89aryy@cbb31a62d89e7b01 -->
<!-- section-name: Limit environment variables (scope: platform) -->
Use environment variables only for secrets and necessary start conditions.

Secrets include API keys, signing secrets, and OAuth client secrets.

Start conditions include `PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and credential directory paths.

Store all other settings in app.
<!-- /station-section:gh7ny4zasd1ezt8cvrhfjkmrfx89aryy -->

<!-- station-section:gh7mn7rvxs6cxdgzk2sk7aj6ax89cqs1@0fd5353ca79da381 -->
<!-- section-name: Record domain terms, decisions, fixes, and Station documents (scope: platform) -->
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

## Fixes

Use the diagnose skill for each defect. There is no other path to a correction.

Do not correct a defect that you diagnosed by another method. Do not correct a defect that you did not diagnose.

Before diagnosis, use `docs_search` to find related fix records.

A defect includes incorrect behavior, a regression, or a configuration error.

Do not create a fix record for a feature, refactor, document change, or simple text correction.

The diagnose skill owns the fix record and its rules.

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

<!-- station-section:gh7htw7cjymgwsjgzv5amtyhfs8cn5kx@15ae9783f2eda142 -->
<!-- section-name: Permit AUTH.md credentials for delegated authentication (scope: platform) -->
Use `/shared/station/AUTH.md` credentials for authorized project authentication.

You can pass these credentials to the active LLM and to delegated agents when this action is necessary to complete an authorized task.

You can pass these credentials in browser tool calls when this action is necessary for authentication.

Do not show a credential in operator communication, final answers, questions, handoffs, status reports, logs, screenshots, or repository files.

Apply the `env-files` rules before you read or use the credentials.
<!-- /station-section:gh7htw7cjymgwsjgzv5amtyhfs8cn5kx -->

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
