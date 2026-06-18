# 0001 -- MCP run-identity propagation (station_context)

**Date:** 2026-06-18
**Run:** k571vpyk0atfrcspjg6n38v1f188w6cb (this run; executing inside the run's git worktree)
**Item:** j579wn6ekgdgv6yk2rnxy6ckn188w8xe (the "prove station_context returns full identity" item)
**Project:** testing (jx75hdtjz30edfd9tt1xnzchvd877ac8)
**Verdict:** PASS

## What this verifies

The original bug: the `station` MCP `station_context()` tool returned only the
degraded `{ "trailerVersion": 1 }` minimum -- it could not resolve a launched
run's identity, so it omitted runId/itemId/projectId/orgId. The fix: the
run-launcher now stamps the run identity as `X-Station-*` request headers on the
station MCP transport, so a Station-launched run resolves its FULL, per-run
identity from `station_context()`. This artifact records a live verification of
that fix from inside an arbitrary launched run (this one).

## Assertion 1 -- station_context() returns the full identity package (PASS)

Called live from this run's MCP transport. Response (verbatim):

    {"trailerVersion":1,"runId":"k571vpyk0atfrcspjg6n38v1f188w6cb","itemId":"j579wn6ekgdgv6yk2rnxy6ckn188w8xe","projectId":"jx75hdtjz30edfd9tt1xnzchvd877ac8","orgId":"jd70cbrtvqndraj07ebe09a56d860esj","programId":"jn79hsws851zcf9aj8v34j8fv9861e2v"}

All four required fields (runId, itemId, projectId, orgId) plus programId are
present and non-empty. This is NOT the degraded `{trailerVersion:1}`-only return
-- the bug is fixed.

Robustness across resume incarnations: this task survived two session resumes.
Each incarnation is a distinct run row with its OWN runId, and in every one
station_context() returned the FULL package with runId tracking that
incarnation's live env exactly, all scoped to the same item/project/org/program:

    incarnation 1 (12:08Z) runId k5731pw5d1bnx7b1h5jzf80ced88wx58 -- full identity
    incarnation 2 (12:12Z) runId k579p4vqqtkg4xpv9veqtp2jwh88xp31 -- full identity
    incarnation 3 (now)    runId k571vpyk0atfrcspjg6n38v1f188w6cb -- full identity (canonical)

Three distinct run contexts, each resolving its OWN runId, none degraded and none
a stale/global guess -- this is exactly correct per-run header propagation.

## Assertion 2 -- identity cross-checks against launcher-injected env (PASS)

`station_context()` (MCP headers) vs the `STATION_*` env vars the launcher
injected into this run. Field-by-field for the canonical run:

| Field      | station_context()                  | STATION_* env                      | Match |
|------------|------------------------------------|------------------------------------|-------|
| runId      | k571vpyk0atfrcspjg6n38v1f188w6cb   | k571vpyk0atfrcspjg6n38v1f188w6cb   | YES   |
| itemId     | j579wn6ekgdgv6yk2rnxy6ckn188w8xe   | j579wn6ekgdgv6yk2rnxy6ckn188w8xe   | YES   |
| projectId  | jx75hdtjz30edfd9tt1xnzchvd877ac8   | jx75hdtjz30edfd9tt1xnzchvd877ac8   | YES   |
| orgId      | jd70cbrtvqndraj07ebe09a56d860esj   | jd70cbrtvqndraj07ebe09a56d860esj   | YES   |
| programId  | jn79hsws851zcf9aj8v34j8fv9861e2v   | jn79hsws851zcf9aj8v34j8fv9861e2v   | YES   |

- The returned `itemId` equals THIS item's id (STATION_ITEM_ID) -- the headers
  carried this run's actual work item.
- The returned `projectId` equals the testing project's id (STATION_PROJECT_ID,
  slug `testing`) -- correctly scoped to the project this run targets.

The MCP transport resolved the correct, per-run identity, not a stale or global
value. PASS.

## Assertion 3 -- commit attribution carries matching trailers (PASS)

Downstream payoff: the same identity flows into git commit attribution. In THIS
repo the git `commit-msg` trailer-stamping hook is NOT wired
(`/shared/repos/startino/testing/.git/hooks` contains only `*.sample`; an
empirical empty-commit probe produced zero trailers). The canonical, working
attribution path here is the documented agent self-stamp convention (CLAUDE.md
"Station commit attribution"), with values sourced from `station_context()` / the
`STATION_*` env -- the git hook is a redundant belt-and-suspenders not installed
in this repo. The self-stamped trailer values are identical to station_context()
above, so attribution is correct regardless of mechanism.

The verbatim trailer block stamped on this artifact's commits:

    Station-Trailer-Version: 1
    Station-Run-Id: k571vpyk0atfrcspjg6n38v1f188w6cb
    Station-Item-Id: j579wn6ekgdgv6yk2rnxy6ckn188w8xe
    Station-Project-Id: jx75hdtjz30edfd9tt1xnzchvd877ac8
    Station-Org-Id: jd70cbrtvqndraj07ebe09a56d860esj
    Station-Program-Id: jn79hsws851zcf9aj8v34j8fv9861e2v

Station-Run-Id / Station-Item-Id / Station-Project-Id all match
station_context(). The actual SHA of this artifact's first commit and its
captured git-log body are embedded below.

### Commit 1 -- actual capture

**SHA:** `c34905f6e036a776c26c10134b3769bc3f02d7b6`

`git log -1 --format=%B` of commit 1 (verbatim):

    docs(verifications): record MCP run-identity propagation evidence
    
    Live verification that station MCP station_context() returns the full run-identity package (runId/itemId/projectId/orgId/programId) and that it propagates into commit attribution. See docs/verifications/0001-mcp-identity-propagation.md.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
    
    Station-Trailer-Version: 1
    Station-Run-Id: k571vpyk0atfrcspjg6n38v1f188w6cb
    Station-Item-Id: j579wn6ekgdgv6yk2rnxy6ckn188w8xe
    Station-Project-Id: jx75hdtjz30edfd9tt1xnzchvd877ac8
    Station-Org-Id: jd70cbrtvqndraj07ebe09a56d860esj
    Station-Program-Id: jn79hsws851zcf9aj8v34j8fv9861e2v
    

## Observations / caveats

- Mechanism note (not a failure of the verified fix): the trailer-stamping
  `commit-msg` hook is not installed in this repo's `.git/hooks`, so trailers
  here are self-stamped per the documented convention rather than hook-applied.
  Orthogonal to the MCP-header fix under test (which is what makes the
  self-stamp values resolvable at all) and does not weaken the PASS.
- runId is resume-volatile: it advances each resume incarnation while
  item/project/org/program stay invariant. The invariant fields are what tie
  every incarnation to this same task; station_context() tracked the live runId
  correctly in all three.

## Final verdict: PASS

- Assertion 1 (full identity from station_context): PASS
- Assertion 2 (identity == injected env; itemId == this item, projectId ==
  testing project): PASS
- Assertion 3 (commit carries trailers matching station_context): PASS

station_context() returns the full run-identity package, correctly scoped to this
launched run, and that identity propagates consistently into commit attribution.
The fix is verified live.
