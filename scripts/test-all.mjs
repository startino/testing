#!/usr/bin/env node
// Zero-dependency monorepo test runner.
//
// Discovers every `src/<module>/package.json` that declares a `test` script,
// runs each module with its OWN declared test runner (so a `node --test`
// module and a `vitest` module are both honoured), and exits non-zero if any
// module fails. When a module declares dependencies it does not yet have
// installed, they are installed first so its runner can actually run — a
// module whose deps cannot be installed is reported as a FAIL, never silently
// skipped.
//
// Uses Node built-ins only — this runner has no runtime dependencies of its
// own.

import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(repoRoot, 'src');

const rel = (p) => (p.startsWith(repoRoot) ? p.slice(repoRoot.length + 1) : p);

function discoverModules() {
  if (!existsSync(srcDir)) return [];
  return readdirSync(srcDir)
    .map((name) => join(srcDir, name))
    .filter((dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .map((dir) => ({ dir, pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) }))
    .filter(({ pkg }) => pkg.scripts && typeof pkg.scripts.test === 'string')
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' });
}

// Install a module's declared deps only when it has some and they are not
// already present. `node --test` modules declare none and skip this entirely,
// keeping them fully offline.
function ensureDeps({ dir, pkg }) {
  const declaresDeps =
    (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) ||
    (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0);
  if (!declaresDeps) return true;
  if (existsSync(join(dir, 'node_modules'))) return true;

  const hasLock = existsSync(join(dir, 'package-lock.json'));
  const cmd = hasLock ? 'ci' : 'install';
  console.log(`[deps] ${rel(dir)} -> npm ${cmd}`);
  const res = run('npm', [cmd, '--no-audit', '--no-fund'], dir);
  return res.status === 0;
}

const modules = discoverModules();
if (modules.length === 0) {
  console.error('No testable modules found under src/. Nothing to run.');
  process.exit(1);
}

console.log(`Discovered ${modules.length} testable module(s):`);
for (const m of modules) console.log(`  - ${rel(m.dir)} (${m.pkg.name ?? 'unnamed'})`);

const results = [];
for (const m of modules) {
  console.log(`\n===== ${rel(m.dir)} =====`);
  if (!ensureDeps(m)) {
    console.error(`[deps] install FAILED for ${rel(m.dir)}`);
    results.push({ dir: m.dir, ok: false, phase: 'install' });
    continue;
  }
  const res = run('npm', ['test'], m.dir);
  results.push({ dir: m.dir, ok: res.status === 0, phase: 'test' });
}

console.log('\n-------- summary --------');
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${rel(r.dir)}${r.ok ? '' : `  (${r.phase})`}`);
}
console.log('-------------------------');
console.log(`${results.length - failed}/${results.length} module(s) passed`);

process.exit(failed === 0 ? 0 : 1);
