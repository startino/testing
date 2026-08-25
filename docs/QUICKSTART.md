# Contributor quick start

This page gives you the first 10 minutes in this repository. It tells you what
to install, which command to run, where each file goes, and how a change becomes
a merged commit.

Read [`README.md`](../README.md) for the reason this repository exists. Read
[`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full conventions. Read the
[Library Cookbook](./LIBRARY_COOKBOOK.md) for recipes that combine the `src/`
libraries.

## 1. Prerequisites

- Node.js 24 or later. The root `package.json` declares `"node": ">=24"`.
- npm 10 or later. Node.js 24 supplies a sufficient npm.
- Git with rebase configuration. This repository keeps a linear history.

Nothing else is necessary. The `src/` libraries have no runtime dependencies.
Only the `web/` app installs packages.

## 2. First commands

```sh
git clone https://github.com/startino/testing.git
cd testing
npm run doctor -- --quick
```

The quick run needs no installation. It completes in approximately one second.
It tells you if the checkout is complete and if the documentation is current.

Before you push a change, run the full check:

```sh
npm run doctor
```

The full run adds the test suite and the `web/` app checks. It installs the
`web/` dependencies if they are absent. A green full run predicts a green
continuous-integration run. See section 4.

## 3. Repository map

| Path | Contents |
|---|---|
| [`src/`](../src/) | One directory for each zero-dependency library. Each directory has its own `package.json`, entry file, `README.md`, and tests. |
| [`web/`](../web/) | The SvelteKit application. See [`DEV.md`](../DEV.md) to run it. |
| [`scripts/`](../scripts/) | Repository commands. Each command uses Node.js built-in modules only. |
| [`docs/`](./) | This page, the [catalog](./CATALOG.md), the [cookbook](./LIBRARY_COOKBOOK.md), and decision records. |
| [`examples/`](../examples/) | Runnable programs that the cookbook explains. |
| `.github/workflows/` | The continuous-integration workflow. |

The two generated files are [`src/README.md`](../src/README.md) and
[`docs/CATALOG.md`](./CATALOG.md). Do not edit these two files. Generate them
with the commands in section 4.

`CLAUDE.md` and `AGENTS.md` are Station-managed files. Do not edit them in this
repository.

## 4. The commands and their gates

| Command | Result |
|---|---|
| `npm run doctor` | Runs each check in this table, plus the environment and layout checks. |
| `npm run doctor -- --quick` | Runs the fast checks only. It omits the test suite and the `web/` app. |
| `npm run doctor -- --list` | Prints the check list. It runs no check. |
| `npm test` | Runs the tests of each `src/` library and the `web/` app. |
| `npm run gen:docs` | Writes `src/README.md` from the modules on disk. |
| `npm run check:docs` | Fails if `src/README.md` is not current. |
| `npm run gen:catalog` | Writes `docs/CATALOG.md` from the modules on disk. |
| `npm run check:catalog` | Fails if `docs/CATALOG.md` is not current. |

Continuous integration runs the test suite, the two catalog checks, and the
`web/` typecheck and lint. The `ci:parity` check in `npm run doctor` reads
`.github/workflows/ci.yml` and fails if the workflow contains a step that the
doctor command does not run. Therefore the local command stays equal to the
remote gate.

## 5. Add a library

1. Make the directory `src/<name>/`.
2. Write `src/<name>/package.json`. Include `name`, `description`, `main`,
   `"type": "module"`, and a `test` script. The two generated catalogs read
   these fields.
3. Write the entry file that `main` identifies. Import Node.js built-in modules
   only.
4. Write `src/<name>/README.md`.
5. Write the tests. Put them in a `__tests__/` directory or beside the source
   file. Use the layout of an adjacent module.
6. Run `npm run gen:docs` and `npm run gen:catalog`. Commit the two generated
   files with your change.
7. Run `npm run doctor`.

The `layout:modules` check enforces steps 1 to 5. It fails if a module has no
description, no README, no `test` script, or an entry file that is absent.

## 6. Change the web application

```sh
cd web
npm install
npm run dev
```

The development server uses port 5173. [`DEV.md`](../DEV.md) gives the routes
and the port options.

## 7. Land the change

1. Make a branch. Do not commit to `alpha`.
2. Commit your change with the generated files.
3. Push the branch and open a pull request.
4. Enable auto-merge with the rebase method.

This repository permits the rebase method only. Use
`gh pr merge <number> --rebase` or the **Rebase and merge** button. Do not use
`git merge`, `--squash`, or `--no-rebase`.

Continuous integration is the gate. The pull request merges into `alpha` after
the workflow is green.

## 8. Read next

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — the full conventions and the work
  flow of this repository.
- [`docs/CATALOG.md`](./CATALOG.md) — each library, its entry point, and its
  test command.
- [`docs/LIBRARY_COOKBOOK.md`](./LIBRARY_COOKBOOK.md) — recipes that combine
  the libraries.
- [`docs/why-ci.md`](./why-ci.md) and [`docs/ci-notes.md`](./ci-notes.md) — the
  reason for the gate and its behavior.
- [`docs/adr/`](./adr/) — the decisions behind the two deliverable tracks.
