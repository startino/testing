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

<!-- station-section:gh7mn7rvxs6cxdgzk2sk7aj6ax89cqs1@bda0f7626ea93141 -->
<!-- section-name: Record domain terms, decisions, fixes, and Station documents (scope: platform) -->
## Domain terms

Use `CONTEXT.md` only for selected domain terms.

Record one meaning for each term. Record its relations. Add an example dialogue.

Use `/shared/station/skills/station/guidance/context-format.md`.

## Decisions

If all these conditions are true, create an ADR:

- The team cannot easily reverse the decision.
- Future work needs the decision context.
- The team selected one option and rejected another option.

Use `/shared/station/skills/station/guidance/adr-format.md`.

## Fixes

Before diagnosis, use `docs_search` to find related fix records.

After root-cause investigation and correction, create a fix record.

A defect includes incorrect behavior, a regression, or a configuration error.

Do not create a fix record for a feature, refactor, document change, or simple text correction.

Record the symptom, affected system, root cause, evidence, rejected causes, correction, and commit.

Use `/shared/station/skills/station/guidance/fixes-format.md`.

## Station documents

Use `docs_add` to create a Station document.

Use `docs_update` to change or retire a Station document.

Let Station select the document number.

Commit the generated document with its related change.
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

<!-- station-rules-end -->
