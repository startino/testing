# Project status

This repository is Station's disposable testing sandbox. It contains 15 self-contained Node.js utility modules under `src/`.

The `web/` directory contains a SvelteKit application named Release Readiness. The application stores checklist progress in browser local storage.

The public application is available at <https://testing-alpha.up.railway.app>. The application also provides a JSON health check at `/health`.

## Requirements

Install Node.js 24 or later. Use npm 10 or later.

## Repository commands

Run these commands from the repository root.

Inspect the current checkout:

```sh
npm run pulse
```

Run the quick static checks without installing packages:

```sh
npm run doctor -- --quick
```

Run the complete repository checks:

```sh
npm run doctor
```

Run all module and web application tests:

```sh
npm test
```

## Local web application

Install the web dependencies and start the development server:

```sh
cd web
npm install
npm run dev
```

Vite uses port 5173 by default. Open <http://localhost:5173> after the server starts.
