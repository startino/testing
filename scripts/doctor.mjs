#!/usr/bin/env node
// Zero-dependency repository health check — the one command a new contributor
// runs to find out whether this checkout is sane and whether a change is ready
// to push.
//
// It runs, in order: an environment preflight (Node/npm versions), the
// repo-layout invariants every `src/<module>/` must satisfy, the relative
// Markdown link graph, both generated-catalog drift gates, the full monorepo
// test suite, and the web app's typecheck + lint. Those last four are exactly
// what `.github/workflows/ci.yml` gates on, so a green `npm run doctor` means a
// green CI — checked, not assumed: the `ci:parity` check re-reads the workflow
// and fails when CI grows a step this script does not run.
//
// Modes:
//   (no args)   FULL   — everything, including the test suite and the web app.
//   --quick     FAST   — static checks only (no test suite, no web install).
//   --list      PLAN   — print the check list and exit.
//
// Uses Node built-ins only — no runtime dependencies.

import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(repoRoot, 'src');
const webDir = join(repoRoot, 'web');

const rel = (p) => (p.startsWith(repoRoot) ? p.slice(repoRoot.length + 1) : p);

// A check reports `{ ok, detail?, notes? }`. `detail` is the one-line reason a
// check failed; `notes` are extra lines printed under it. Returning
// `{ skipped: true }` records the check as SKIP and leaves the exit code alone.
const pass = (detail) => ({ ok: true, detail });
const fail = (detail, notes = []) => ({ ok: false, detail, notes });
const skip = (detail) => ({ skipped: true, detail });

function runCommand(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8' });
}

// Run a gate command and turn a non-zero exit into a failure that carries the
// command's own last lines — the generators and runners already print an
// actionable fix hint, so quoting them beats inventing a second message.
function commandCheck(cmd, args, cwd, hint) {
  const res = runCommand(cmd, args, cwd);
  if (res.error) return fail(`${cmd} could not start: ${res.error.message}`);
  if (res.status === 0) return pass(`${cmd} ${args.join(' ')} exited 0`);
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-12);
  return fail(`exit ${res.status} — ${hint}`, output);
}

function checkNode() {
  const declared = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).engines?.node;
  const minimum = Number.parseInt((declared ?? '>=24').replace(/[^0-9]/g, ''), 10);
  const actual = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (actual >= minimum) return pass(`node v${process.versions.node} satisfies "${declared}"`);
  return fail(`node v${process.versions.node} is older than the declared engine "${declared}"`, [
    `Install Node ${minimum} or later, then re-run this command.`,
  ]);
}

function checkNpm() {
  const res = runCommand('npm', ['--version'], repoRoot);
  if (res.status !== 0) return fail('npm is not on PATH — module tests and the web app cannot run');
  return pass(`npm v${(res.stdout ?? '').trim()}`);
}

function moduleDirs() {
  if (!existsSync(srcDir)) return [];
  return readdirSync(srcDir)
    .map((name) => ({ name, dir: join(srcDir, name) }))
    .filter(({ dir }) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    })
    .filter(({ dir }) => existsSync(join(dir, 'package.json')))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The shape every `src/<module>/` is expected to hold (CONTRIBUTING.md, "Prefer
// the proven deliverable shapes"): a description and entry point the generated
// catalogs can project, an entry file that exists, a `test` script so the suite
// picks the module up, and a README a reader can land on.
function checkModuleLayout() {
  const modules = moduleDirs();
  if (modules.length === 0) return fail('no module found under src/ — expected at least one');

  const problems = [];
  for (const { name, dir } of modules) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const entry = (pkg.main ?? 'index.js').replace(/^\.\//, '');
    if (!pkg.description) problems.push(`src/${name}: package.json has no "description"`);
    if (!existsSync(join(dir, entry)))
      problems.push(`src/${name}: entry "${entry}" from package.json "main" does not exist`);
    if (typeof pkg.scripts?.test !== 'string')
      problems.push(`src/${name}: no "test" script — the suite would skip this module`);
    if (!existsSync(join(dir, 'README.md'))) problems.push(`src/${name}: no README.md`);
  }

  if (problems.length > 0)
    return fail(`${problems.length} layout problem(s) across ${modules.length} module(s)`, problems);
  return pass(`${modules.length} module(s) hold the src/<module>/ shape`);
}

function markdownFiles() {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.md')) files.push(path);
    }
  };
  walk(join(repoRoot, 'docs'));
  walk(srcDir);
  for (const name of ['README.md', 'CONTRIBUTING.md', 'DEV.md', 'CONTEXT.md', 'SECURITY.md'])
    if (existsSync(join(repoRoot, name))) files.push(join(repoRoot, name));
  return files;
}

// Every relative Markdown link must resolve to a file on disk. External URLs
// and bare anchors are out of scope — this catches the drift that renames and
// deletions cause in the docs the contributor is told to read.
function checkDocLinks() {
  const broken = [];
  let linkCount = 0;
  for (const file of markdownFiles()) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const raw = match[1];
      if (/^(https?:|mailto:|#)/.test(raw)) continue;
      const [target] = raw.split('#');
      if (!target) continue;
      linkCount++;
      let decoded = target;
      try {
        decoded = decodeURIComponent(target);
      } catch {
        decoded = target;
      }
      if (!existsSync(resolve(dirname(file), decoded)))
        broken.push(`${rel(file)} -> ${raw}`);
    }
  }
  if (broken.length > 0) return fail(`${broken.length} broken relative link(s)`, broken);
  return pass(`${linkCount} relative link(s) resolve`);
}

// Install the web app's deps when they are absent, mirroring what
// scripts/test-all.mjs does for a module that declares dependencies.
function ensureWebDeps() {
  if (!existsSync(webDir)) return { ok: false, reason: 'web/ does not exist' };
  if (existsSync(join(webDir, 'node_modules'))) return { ok: true };
  const install = existsSync(join(webDir, 'package-lock.json')) ? 'ci' : 'install';
  const res = runCommand('npm', [install, '--no-audit', '--no-fund'], webDir);
  if (res.status !== 0) return { ok: false, reason: `npm ${install} failed in web/` };
  return { ok: true };
}

function webCheck(script) {
  const deps = ensureWebDeps();
  if (!deps.ok) return fail(deps.reason, ['Run `cd web && npm ci` and re-run this command.']);
  return commandCheck('npm', ['run', script], webDir, `fix the reported web ${script} errors`);
}

// Commands the CI workflow runs that are setup, not a gate. `ci:parity` ignores
// these; every other `run:` line must be covered by a check below.
const CI_SETUP_COMMANDS = new Set(['npm ci --no-audit --no-fund']);

// Read the single-line `run:` commands out of the CI workflow. A block scalar
// (`run: |`) is deliberately out of scope: this repo's workflow uses one-line
// commands, and a silent partial parse would be worse than an obvious gap.
function ciCommands() {
  const workflow = join(repoRoot, '.github', 'workflows', 'ci.yml');
  if (!existsSync(workflow)) return null;
  return readFileSync(workflow, 'utf8')
    .split('\n')
    .map((line) => line.match(/^\s*run:\s*(\S.*)$/))
    .filter(Boolean)
    .map((match) => match[1].trim())
    .filter((command) => !command.startsWith('|') && !command.startsWith('>'));
}

// The drift gate on this script itself: a CI step nobody mirrored here would
// make a green `npm run doctor` a false promise.
function checkCiParity(checks) {
  const commands = ciCommands();
  if (commands === null) return skip('no .github/workflows/ci.yml to compare against');
  const covered = new Set(checks.map((check) => check.ciCommand).filter(Boolean));
  const missing = commands.filter(
    (command) => !covered.has(command) && !CI_SETUP_COMMANDS.has(command),
  );
  if (missing.length > 0)
    return fail(`${missing.length} CI step(s) are not mirrored by this script`, [
      ...missing.map((command) => `CI runs: ${command}`),
      'Add a matching check (with its `ciCommand`) to scripts/doctor.mjs.',
    ]);
  return pass(`${commands.length} CI step(s) all covered`);
}

const CHECKS = [
  { id: 'env:node', title: 'Node version matches the declared engine', run: checkNode },
  { id: 'env:npm', title: 'npm is available', run: checkNpm },
  { id: 'layout:modules', title: 'src/ modules hold the expected shape', run: checkModuleLayout },
  { id: 'docs:links', title: 'relative Markdown links resolve', run: checkDocLinks },
  {
    id: 'docs:toolbox',
    title: 'src/README.md matches the modules on disk',
    ciCommand: 'node scripts/gen-toolbox-readme.mjs --check',
    run: () =>
      commandCheck(
        'node',
        ['scripts/gen-toolbox-readme.mjs', '--check'],
        repoRoot,
        'run `node scripts/gen-toolbox-readme.mjs` and commit the result',
      ),
  },
  {
    id: 'docs:catalog',
    title: 'docs/CATALOG.md matches the modules on disk',
    ciCommand: 'node scripts/gen-catalog.mjs --check',
    run: () =>
      commandCheck(
        'node',
        ['scripts/gen-catalog.mjs', '--check'],
        repoRoot,
        'run `node scripts/gen-catalog.mjs` and commit the result',
      ),
  },
  {
    id: 'tests:suite',
    title: 'every module test suite passes',
    ciCommand: 'node scripts/test-all.mjs',
    slow: true,
    run: () =>
      commandCheck(
        'node',
        ['scripts/test-all.mjs'],
        repoRoot,
        'run `npm test` for the per-module output',
      ),
  },
  {
    id: 'web:check',
    title: 'web app typecheck',
    ciCommand: 'npm run check',
    slow: true,
    run: () => webCheck('check'),
  },
  {
    id: 'web:lint',
    title: 'web app lint',
    ciCommand: 'npm run lint',
    slow: true,
    run: () => webCheck('lint'),
  },
];

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/doctor.mjs [--quick] [--list]');
    console.log('  --quick  static checks only (skip the test suite and the web app)');
    console.log('  --list   print the check list without running it');
    return;
  }

  const plan = [...CHECKS, { id: 'ci:parity', title: 'CI steps are all mirrored here' }];

  if (argv.includes('--list')) {
    for (const check of plan)
      console.log(`  ${check.id.padEnd(16)} ${check.title}${check.slow ? '  (slow)' : ''}`);
    return;
  }

  const quick = argv.includes('--quick');
  console.log(`Repository health — ${quick ? 'quick' : 'full'} run`);

  const results = [];
  for (const check of plan) {
    const started = Date.now();
    const result =
      check.id === 'ci:parity'
        ? checkCiParity(CHECKS)
        : quick && check.slow
          ? skip('skipped by --quick')
          : check.run();
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const state = result.skipped ? 'SKIP' : result.ok ? 'PASS' : 'FAIL';
    console.log(`  ${state}  ${check.id.padEnd(16)} ${result.detail ?? check.title}  (${seconds}s)`);
    for (const note of result.notes ?? []) console.log(`          ${note}`);
    results.push({ id: check.id, ...result });
  }

  const failed = results.filter((result) => !result.ok && !result.skipped);
  const skipped = results.filter((result) => result.skipped);
  console.log('\n-------- summary --------');
  console.log(
    `  ${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`,
  );
  if (failed.length > 0) {
    console.log(`  failing: ${failed.map((result) => result.id).join(', ')}`);
    console.log('-------------------------');
    process.exit(1);
  }
  if (quick) console.log('  run without --quick before you push: the slow checks are the CI gate.');
  console.log('-------------------------');
}

main();
