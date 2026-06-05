# The testing sandbox stands up a real, deployable SvelteKit web app under `web/`, auto-deployed to Railway on push to `alpha`

**Status:** Accepted

Until now the `testing` sandbox was docs-only: `CONTEXT.md` framed it as a place for self-contained, zero-dependency Node v24+ ESM modules with explicitly "no deploy in this sandbox." On 2026-06-05 the operator decided to stand up a real, deployable web application alongside that experiment track. We add a SvelteKit app under `web/` -- SvelteKit + TypeScript, TailwindCSS v4, shadcn-svelte (bits-ui) components, and `@sveltejs/adapter-node` -- and deploy it to Railway, which auto-deploys on every push to the `alpha` branch. The app intentionally ships with **no authentication and no database**.

## Context

The sandbox's only proven deliverable shape was the zero-dependency Node module (`src/unicode/`, `src/flags/`): no build, no server, no deploy, "the fresh process is the refresh" (see ADR 0001). That shape has nothing to render and nowhere to be reached from a browser. The operator's decision to have an actual deployed surface -- a live app that exercises a frontend stack and a real hosting path -- under-determines nothing once grounded:

1. **A real deploy target is the point.** The value is a public, running app, not another disposable module. That requires a framework, an adapter that produces a Node server, and a host that builds and runs it.
2. **Coexistence, not replacement.** The zero-dep Node experiments remain valid and untouched elsewhere in the repo. The web app is a second, parallel track -- it supersedes the "no deploy" framing only for itself, not for the module experiments.
3. **Keep the surface minimal.** No auth and no DB were intentionally dropped from the original request: a purely public, static-leaning scaffold is the smallest thing that proves the stack and the deploy path end to end.

## Decision

- **Stack.** SvelteKit + TypeScript, TailwindCSS v4, shadcn-svelte (bits-ui) components, `@sveltejs/adapter-node` (the adapter emits a standalone Node server).
- **Location.** The app lives under `web/`.
- **Host.** Railway -- project `testing` (`e3d3273f-65d6-45ae-b5f2-fa7922b597d7`), environment `alpha`, service `testing`, builder `RAILPACK`, root directory `/web`.
- **Runtime.** The Node server listens on `$PORT`; Railway sets `PORT=3000`.
- **Deploy trigger.** The service **auto-deploys on push to the `alpha` branch** -- no manual deploy step.
- **Public domain.** `https://testing-alpha.up.railway.app`.
- **No auth, no DB.** Both were intentionally dropped. A future *cloud* Convex backend is possible but explicitly out of scope for now; a local-on-host database is never an option.

## Considered options

- **A future cloud Convex backend now -- deferred, out of scope.** The app needs no data layer to prove the stack and the deploy path. Convex can be added additively later if a real data need appears; standing it up now is unrequested effort.
- **A local-on-host database -- rejected outright.** Platform doctrine forbids a local-on-host DB. If state is ever needed it goes to a cloud backend, never to disk on the host.
- **Authentication in the initial scaffold -- rejected.** Nothing to protect: the app is intentionally public and static-leaning. Auth would be effort spent guarding a surface that exposes no secrets.
- **Stay docs-only -- rejected by the operator.** The explicit decision is to have a real, deployable, running surface; another zero-dep module would not deliver that.

## Consequences

- This **supersedes the "no deploy in this sandbox" framing** in `CONTEXT.md` for the web-app track only. There is now a build, a Node server, and a continuous deploy on push to `alpha`. The zero-dependency Node module experiments (and their "no deploy / fresh process is the refresh" model from ADR 0001) still hold for their own track and coexist in the same repo.
- `/web` is the Railway build root; build/run configuration is read from there, not the repo root.
- Any runtime config or secrets live in **Railway service variables**, consistent with the platform's env-vars-for-secrets-only doctrine. The public app exposes no secrets.
- Because the service auto-deploys on push to `alpha`, every merge to `alpha` is a production deploy of the public app -- the branch and the live surface are coupled by default.
