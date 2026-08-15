---
kind: fix
number: 4
title: Railway alpha build fails because the web root directory excludes repository src modules
status: resolved
retired: false
relations:
  supersedes: []
date: 2026-08-15
tags: [railway, deploy, build-context, web, monorepo]
usageEffect: none
---

# Railway alpha build fails because the web root directory excludes repository src modules

**Date:** 2026-08-15
**Symptom:** The Railway alpha deployment of commit `8001164` failed. `https://testing-alpha.up.railway.app/` continued to serve an older successful build, so the failure was not visible in the browser.
**Affected:** Railway project `testing` (`e3d3273f-65d6-45ae-b5f2-fa7922b597d7`), environment `alpha`, service `testing` (`c38198ac-43e0-4821-8dda-dc3f8e1e5df5`); `web/src/lib/duration.ts:15`, `web/src/lib/slugify.ts:12`, `web/src/lib/bytes.ts:14`, `web/src/lib/csv.ts:13`, `web/src/lib/semver.ts:14`, `web/src/lib/deep-equal.ts:2`
**Root cause:** The service root directory was `/web`. The build context contained only the `web/` subtree. Six adapter modules in `web/src/lib/` re-export the shipped libraries under the repository `src/` directory with the relative path `../../../src/...`. That path leaves the build context, so the bundler could not resolve it.

## Investigation

1. Read the service configuration through the Railway GraphQL API. The result was `rootDirectory: "/web"`, `builder: "RAILPACK"`, `buildCommand: null`, `startCommand: null`, and `railwayConfigFile: null`. All build behavior came from the dashboard.
2. Read the deployment list for the alpha environment. The most recent deployment had status `FAILED` for commit `8001164`.
3. Read the build log of the failed deployment. It showed six `[UNRESOLVED_IMPORT]` errors, one for each adapter module, each with the message `Could not resolve '../../../src/<module>' ... Module not found`, followed by `Build Failed`.
4. Rejected cause: a dependency or lockfile problem. The install step completed. Only the bundle step failed, and it failed on module resolution alone.
5. Rejected cause: a local-only problem. `vite build` succeeds in the worktree because the local repository root contains both `web/` and `src/`. Only the Railway build context is short.
6. Learned that the failure was silent to an observer. Railway keeps the last healthy deployment live, so the public page still answered `200` with the previous title.

## Fix

Moved the build context to the repository root and kept every command scoped to `web`:

- Railway service `rootDirectory` changed from `/web` to `/`, and `railwayConfigFile` set to `railway.json`. Both changes were applied to the `alpha` environment through the Railway GraphQL API.
- Added `railway.json` at the repository root. It pins `builder: RAILPACK`, `buildCommand: "npm ci --prefix web --include=dev --no-audit --no-fund && npm run build --prefix web"`, and `startCommand: "node web/build"`.
- `--include=dev` is deliberate. The build tools of the app are development dependencies, and the build image can set `NODE_ENV=production`.

The build context now contains `src/`, so the six adapter modules resolve. Install, build, and start still act on `web` only.

## Proof

The alpha deployment of the merge commit reported `SUCCESS` with `rootDirectory: "/"` and the two commands above in its manifest. `https://testing-alpha.up.railway.app/` then served the new page with the title `Release Readiness`.

**Note for a future reader:** an ephemeral Railway environment, such as a pull-request preview, does not inherit a later change to the `alpha` service instance. It copies the settings that exist when the environment is created. Set `rootDirectory` on the new environment too, or its build fails with the same six errors.

**Commit:** `7e055de` (pull request #67)
