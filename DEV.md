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

- `/` -- home page
- `/health` -- JSON health check: `{ "status": "ok", "app": "testing" }`

## Stack

- SvelteKit (adapter-node)
- Tailwind v4 via `@tailwindcss/vite`
- shadcn-svelte components

## Notes

- This is a per-run worktree. Do NOT run this from the shared checkout at `/shared/repos/startino/testing`.
- If port 5173 is held by another run's preview, pass `--port <n>` and increment.
- `npm install` is required on first use -- node_modules are not shared between worktrees.
