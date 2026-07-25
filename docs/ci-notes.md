# CI notes

## Why CI matters

General notes on the value of CI; this repo's own pipeline is described in the next section.

- Every proposed change runs the test suite before merge, so regressions surface early.
- The trunk branch stays green: changes land only with no detected regression.
- Lint and style gates are enforced mechanically, not left to human reviewers.

## The CI setup (now real)

This repo previously documented *why* CI matters without actually having any. It now does:

- **Workflow:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every `pull_request` and on `push` to `alpha`. It checks out the repo, sets up Node 24 (matching the modules' `engines`), and runs the whole monorepo suite.
- **Runner:** [`scripts/test-all.mjs`](../scripts/test-all.mjs) is a zero-dependency Node script (built-ins only). It discovers every `src/<module>/package.json` that declares a `test` script and runs each module with its *own* declared runner — so a `node --test` module and a `vitest` module are both honoured. A module whose dependencies cannot be installed is reported as a failure, never silently skipped.
- **Root command:** `npm test` at the repo root runs `scripts/test-all.mjs`.

## Why this gate matters for the autonomous flow

This repo auto-merges PRs with no human reviewer (see the README auto-merge policy). Without a CI gate, "auto-merge once checks pass" had no checks to pass — every merge was blind. This workflow is that gate: a PR only reaches `alpha` once the full suite is green.
