# Dev Environment

This worktree runs an isolated SvelteKit + Tailwind v4 app under `web/`.

## Quick start

```sh
cd web
npm install
npm run dev
```

Vite default port: **5173**. To use a different port:

```sh
npm run dev -- --port 5174
```

## Routes

The app is one product. It has one public page.

- `/` -- Release Readiness: the release checklist, its owners, its due dates,
  and its progress. Progress is stored in the browser under
  `localStorage["startino.release-readiness.v1"]`.
- `/health` -- JSON health check: `{ "status": "ok", "app": "testing" }`

The `src/lib/` modules, the `src/lib/components/ui/` primitives, and the
adapters over the `src/` libraries are internal implementation. They have no
public route and no navigation entry.

## Stack

- SvelteKit (adapter-node)
- Tailwind v4 via `@tailwindcss/vite`
- shadcn-svelte components

## Deploy build context

Railway builds this app from the **repository root**, not from `web/`. The
`web/src/lib/` adapters import the shipped libraries under `src/`, so the build
context must contain both trees. `railway.json` at the repository root keeps
install, build, and start scoped to `web`:

```sh
npm ci --prefix web --include=dev --no-audit --no-fund && npm run build --prefix web
node web/build
```

Run those two commands from the repository root to reproduce the deploy build
locally.

## Notes

- This is a per-run worktree. Do NOT run this from the shared checkout at `/shared/repos/startino/testing`.
- If port 5173 is held by another run's preview, pass `--port <n>` and increment.
- `npm install` is required on first use -- node_modules are not shared between worktrees.
