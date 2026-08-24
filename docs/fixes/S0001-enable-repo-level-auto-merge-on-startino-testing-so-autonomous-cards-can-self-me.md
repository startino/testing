---
number: 1
title: Enable repo-level auto-merge on startino/testing so autonomous cards can
  self-merge
status: resolved
retired: false
date: 2026-07-10
---

# Enable repo-level auto-merge on startino/testing so autonomous cards can self-merge

**Status:** Resolved

**Date:** 2026-07-10
**Symptom:** Autonomous cards instructed to "enable auto-merge (rebase)" failed at `gh pr merge <N> --rebase --auto` with `Auto merge is not allowed for this repository`. The whole "PRs auto-merge once finished" premise of the autonomous sandbox was silently broken — agents either parked PRs unmerged or fell back to manually watching CI then rebase-merging.
**Affected:** GitHub repo `startino/testing` settings (`allow_auto_merge=false`); every autonomous run that opens a PR.
**Root cause:** The repository had `enablePullRequestAutoMerge` / `allow_auto_merge` disabled at the GitHub level — a repo-owner setting, not something any code change or PR can flip. `gh pr merge --auto` requires it to be on.

## Investigation
1. deep-equal build run (PR #36) tried `gh pr merge 36 --rebase --auto` → "Auto merge is not allowed for this repository". Confirmed it was a repo setting, not a branch-protection or permissions issue.
2. `gh api repos/startino/testing` showed `allow_auto_merge:false`, `allow_rebase_merge:true`, `delete_branch_on_merge:false`. Branch protection on `alpha` requires only the `monorepo test suite` check (no required reviews), so once CI is green a rebase-merge is permitted — which is why the monitor-then-merge workaround succeeded.

## Fix
`gh api -X PATCH repos/startino/testing -F allow_auto_merge=true -F delete_branch_on_merge=true`. Now `gh pr merge --auto` is accepted, so agents can enable auto-merge and let the CI gate land the PR unattended; merged branches are auto-deleted.

**Commit:** n/a (GitHub repo setting, no code change)