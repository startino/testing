#!/usr/bin/env node
// Repository pulse — the one command that answers "what state is this checkout
// in right now?" before a contributor starts work or pushes.
//
// It reports, in order: the current branch (with its local ahead/behind count
// against the tracked base), whether the worktree is clean or carries changes,
// the latest commit, the project manifests detected on disk, and the
// verification commands this repository offers — the root npm scripts plus the
// steps `.github/workflows/ci.yml` gates a pull request on.
//
// Every fact comes from local data: the git object store, files on disk, and
// the CI workflow. Nothing on the network is read, so the report is honest
// about the checkout in front of you and never blocks.
//
// This command reports; it does not judge. `npm run doctor` is the gate that
// passes or fails. Pulse always exits 0.
//
// Modes:
//   (no args)   the human-readable report.
//   --json      the same facts as JSON, for a script that consumes them.
//   --help      usage.
//
// Uses Node built-ins only — no runtime dependencies.

import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Directories that never hold a first-party manifest, and that are large enough
// that walking them would dominate the runtime of this command.
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'vendor']);

// How deep below the repository root a manifest is still looked for. The two
// deliverable tracks here live at depth 1 (`src/<module>/`, `web/`); the extra
// levels catch a nested package without walking an entire tree.
const MANIFEST_DEPTH = 3;

// Manifest file name -> the ecosystem it declares. Lockfiles are deliberately
// absent: they record a resolution, not a project.
const MANIFEST_KINDS = new Map([
  ['package.json', 'node'],
  ['deno.json', 'deno'],
  ['deno.jsonc', 'deno'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['setup.py', 'python'],
  ['Cargo.toml', 'rust'],
  ['go.mod', 'go'],
  ['Gemfile', 'ruby'],
  ['composer.json', 'php'],
  ['pom.xml', 'java'],
  ['build.gradle', 'java'],
  ['build.gradle.kts', 'java'],
]);

const relative = (path) => (path === repoRoot ? '' : path.slice(repoRoot.length + 1));

function git(...args) {
  const res = spawnSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' });
  if (res.error || res.status !== 0) return null;
  return (res.stdout ?? '').replace(/\n$/, '');
}

// ---------------------------------------------------------------- branch ----

// The base a branch is measured against: its configured upstream when it has
// one, otherwise the remote's default branch, which is what an unpushed branch
// created from `alpha` is actually ahead of. Both are refs already on disk —
// resolving them fetches nothing.
function trackedBase(branch) {
  const upstream = branch === null ? null : git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}');
  if (upstream) return { ref: upstream, source: 'upstream' };
  const head = git('symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD');
  if (head) return { ref: head.replace(/^refs\/remotes\//, ''), source: 'remote default' };
  return null;
}

function readBranch(insideRepository) {
  if (!insideRepository) return { available: false, reason: 'not a git repository' };

  // `symbolic-ref` names the branch even before its first commit, where
  // `rev-parse HEAD` has nothing to resolve. A null answer means a detached
  // HEAD, which is a state worth naming rather than hiding.
  const branch = git('symbolic-ref', '--quiet', '--short', 'HEAD');
  const head = git('rev-parse', '--short', 'HEAD');
  const detached = branch === null;
  if (detached && head === null) return { available: false, reason: 'no commit yet' };
  const base = trackedBase(branch);
  let ahead = null;
  let behind = null;
  if (base !== null) {
    const counts = git('rev-list', '--left-right', '--count', `${base.ref}...HEAD`);
    if (counts !== null) {
      const [left, right] = counts.split(/\s+/).map((value) => Number.parseInt(value, 10));
      behind = Number.isNaN(left) ? null : left;
      ahead = Number.isNaN(right) ? null : right;
    }
  }

  return {
    available: true,
    name: branch,
    detached,
    head,
    base: base === null ? null : { ...base, ahead, behind },
  };
}

// -------------------------------------------------------------- worktree ----

// `git status --porcelain` reports two status columns per path: the index state
// and the worktree state. A path can be counted in both when it is partially
// staged, which is the honest reading — the contributor has work in two places.
function readWorktree(insideRepository) {
  if (!insideRepository) return { available: false, reason: 'not a git repository' };
  const status = git('status', '--porcelain');
  if (status === null) return { available: false, reason: 'git status could not be read' };

  const entries = status.split('\n').filter((line) => line.trim() !== '');
  const changes = { staged: [], unstaged: [], untracked: [] };
  for (const line of entries) {
    const code = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (code === '??') {
      changes.untracked.push(path);
      continue;
    }
    if (code[0] !== ' ') changes.staged.push(path);
    if (code[1] !== ' ') changes.unstaged.push(path);
  }

  return {
    available: true,
    clean: entries.length === 0,
    changedPaths: entries.length,
    staged: changes.staged.length,
    unstaged: changes.unstaged.length,
    untracked: changes.untracked.length,
    paths: entries.map((line) => ({ status: line.slice(0, 2), path: line.slice(3).trim() })),
  };
}

// ---------------------------------------------------------------- commit ----

const COMMIT_FIELDS = ['%h', '%s', '%an', '%cI', '%cr'];

function readCommit(insideRepository) {
  if (!insideRepository) return { available: false, reason: 'not a git repository' };
  const line = git('log', '-1', `--format=${COMMIT_FIELDS.join('%x1f')}`);
  if (line === null || line === '') return { available: false, reason: 'no commit yet' };
  const [sha, subject, author, date, age] = line.split('\x1f');
  return { available: true, sha, subject, author, date, age };
}

// ------------------------------------------------------------- manifests ----

function findManifests(dir = repoRoot, depth = 0) {
  const found = [];
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return found;
  }

  for (const name of names) {
    const path = join(dir, name);
    let entry;
    try {
      entry = statSync(path);
    } catch {
      continue;
    }
    if (entry.isDirectory()) {
      if (depth >= MANIFEST_DEPTH) continue;
      if (name.startsWith('.') || IGNORED_DIRS.has(name)) continue;
      found.push(...findManifests(path, depth + 1));
      continue;
    }
    const kind = MANIFEST_KINDS.get(name);
    if (kind === undefined) continue;
    found.push({ kind, path: relative(path), name: readManifestName(path, name) });
  }

  return found.sort((a, b) => a.path.localeCompare(b.path));
}

// The project name a manifest declares, when the format makes it cheap to read.
// A manifest that declares none still counts — the file is the evidence.
function readManifestName(path, file) {
  if (!file.endsWith('.json') && !file.endsWith('.jsonc')) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return typeof parsed.name === 'string' ? parsed.name : null;
  } catch {
    return null;
  }
}

// Sibling manifests are a monorepo's normal shape: sixteen `src/<module>/`
// packages are one fact, not sixteen lines. Collapse any parent directory that
// holds more than one so the report stays one screen.
function groupManifests(manifests) {
  const groups = new Map();
  for (const manifest of manifests) {
    const dir = posix.dirname(manifest.path);
    const parent = dir === '.' ? '' : posix.dirname(dir);
    const key = `${parent} ${posix.basename(manifest.path)}`;
    const group = groups.get(key) ?? { members: [], parent };
    group.members.push(manifest);
    groups.set(key, group);
  }

  const rows = [];
  for (const { members, parent } of groups.values()) {
    const [first] = members;
    if (members.length === 1) {
      rows.push({ kind: first.kind, path: first.path, detail: first.name ?? '', count: 1 });
      continue;
    }
    const file = posix.basename(first.path);
    const prefix = parent === '' ? '' : `${parent}/`;
    rows.push({
      kind: first.kind,
      path: `${prefix}*/${file}`,
      detail: `${members.length} packages`,
      count: members.length,
    });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------- verification ----

// The single-line `run:` commands of the CI workflow, each with the directory
// the step runs in. A block scalar (`run: |`) is out of scope for the same
// reason it is in scripts/doctor.mjs: this workflow uses one-line commands, and
// a silent partial parse would be worse than an obvious gap.
function readCiSteps() {
  const workflow = join(repoRoot, '.github', 'workflows', 'ci.yml');
  if (!existsSync(workflow)) return [];

  const steps = [];
  let workingDirectory = null;
  for (const line of readFileSync(workflow, 'utf8').split('\n')) {
    if (/^\s*-\s/.test(line)) workingDirectory = null;
    const directory = line.match(/^\s*working-directory:\s*(\S+)\s*$/);
    if (directory) workingDirectory = directory[1];
    const run = line.match(/^\s*-?\s*run:\s*(\S.*)$/);
    if (!run) continue;
    const command = run[1].trim();
    if (command.startsWith('|') || command.startsWith('>')) continue;
    steps.push({ command, directory: workingDirectory ?? '.' });
  }
  return steps;
}

// Every root npm script is a command the contributor can run. A script whose
// body CI also runs is marked, because that is the one whose result predicts
// the pull-request gate.
function readCommands(ciSteps) {
  const manifest = join(repoRoot, 'package.json');
  if (!existsSync(manifest)) return [];
  let scripts;
  try {
    scripts = JSON.parse(readFileSync(manifest, 'utf8')).scripts ?? {};
  } catch {
    return [];
  }

  const rootCi = new Set(
    ciSteps.filter((step) => step.directory === '.').map((step) => step.command),
  );
  return Object.entries(scripts).map(([name, command]) => ({
    invocation: name === 'test' || name === 'start' ? `npm ${name}` : `npm run ${name}`,
    command,
    ci: rootCi.has(command) || rootCi.has(`npm run ${name}`) || rootCi.has(`npm ${name}`),
  }));
}

// ---------------------------------------------------------------- report ----

function collect() {
  const manifests = findManifests();
  const ciSteps = readCiSteps();
  const insideRepository = git('rev-parse', '--git-dir') !== null;
  return {
    repository: {
      root: repoRoot,
      name: readManifestName(join(repoRoot, 'package.json'), 'package.json') ?? basename(repoRoot),
    },
    branch: readBranch(insideRepository),
    worktree: readWorktree(insideRepository),
    commit: readCommit(insideRepository),
    manifests,
    verification: { commands: readCommands(ciSteps), ci: ciSteps },
  };
}

function describeBranch(branch) {
  if (!branch.available) return [`unavailable — ${branch.reason}`];
  const lines = [];
  if (branch.detached) lines.push(`detached HEAD at ${branch.head}`);
  else if (branch.head === null) lines.push(`${branch.name} — no commit yet`);
  else lines.push(`${branch.name} (${branch.head})`);
  if (branch.head === null) return lines;
  if (branch.base === null) {
    lines.push('no tracked base — there is no upstream and no remote default to compare with');
    return lines;
  }
  const { ref, source, ahead, behind } = branch.base;
  if (ahead === null || behind === null) lines.push(`${ref} (${source}) — cannot be compared locally`);
  else if (ahead === 0 && behind === 0) lines.push(`level with ${ref} (${source})`);
  else lines.push(`${ahead} ahead, ${behind} behind ${ref} (${source})`);
  return lines;
}

// Show enough paths to recognise the work in progress, then a count for the
// rest. `git status` is the command for the whole list.
const PATHS_SHOWN = 8;

function describeWorktree(worktree) {
  if (!worktree.available) return [`unavailable — ${worktree.reason}`];
  if (worktree.clean) return ['clean — no tracked change and no untracked file'];

  const parts = [];
  if (worktree.staged > 0) parts.push(`${worktree.staged} staged`);
  if (worktree.unstaged > 0) parts.push(`${worktree.unstaged} unstaged`);
  if (worktree.untracked > 0) parts.push(`${worktree.untracked} untracked`);
  const lines = [`changed — ${worktree.changedPaths} path(s): ${parts.join(', ')}`];
  for (const entry of worktree.paths.slice(0, PATHS_SHOWN))
    lines.push(`  ${entry.status}  ${entry.path}`);
  if (worktree.paths.length > PATHS_SHOWN)
    lines.push(`  ... and ${worktree.paths.length - PATHS_SHOWN} more — run \`git status\` for all`);
  return lines;
}

function describeCommit(commit) {
  if (!commit.available) return [`unavailable — ${commit.reason}`];
  return [`${commit.sha}  ${commit.subject}`, `${commit.author} — ${commit.age} (${commit.date})`];
}

function describeManifests(manifests) {
  if (manifests.length === 0) return ['none detected'];
  const rows = groupManifests(manifests);
  const width = Math.max(...rows.map((row) => row.path.length));
  return [
    `${manifests.length} detected in ${rows.length} location(s)`,
    ...rows.map((row) => `  ${row.kind.padEnd(7)} ${row.path.padEnd(width)}  ${row.detail}`),
  ];
}

function describeVerification({ commands, ci }) {
  const lines = [];
  if (commands.length === 0) lines.push('no root npm script declared');
  else {
    const width = Math.max(...commands.map((command) => command.invocation.length));
    for (const command of commands)
      lines.push(`  ${command.invocation.padEnd(width)}  ${command.command}${command.ci ? '  [ci]' : ''}`);
  }

  if (ci.length === 0) lines.push('', '  no CI workflow detected');
  else {
    lines.push('', `  continuous integration runs ${ci.length} step(s):`);
    for (const step of ci)
      lines.push(`    ${step.command}${step.directory === '.' ? '' : `  (in ${step.directory}/)`}`);
  }
  return lines;
}

function printReport(pulse) {
  const sections = [
    ['branch', describeBranch(pulse.branch)],
    ['worktree', describeWorktree(pulse.worktree)],
    ['latest commit', describeCommit(pulse.commit)],
    ['manifests', describeManifests(pulse.manifests)],
    ['verification', describeVerification(pulse.verification)],
  ];

  console.log(`Repository pulse — ${pulse.repository.name}`);
  for (const [title, lines] of sections) {
    console.log(`\n${title}`);
    for (const line of lines) console.log(line === '' ? '' : `  ${line}`);
  }
  console.log('\nThis report reads local data only. Run `npm run doctor` for the gate.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/pulse.mjs [--json]');
    console.log('  Reports branch, worktree state, latest commit, project manifests,');
    console.log('  and the verification commands of this repository, from local data only.');
    console.log('  --json   print the same facts as JSON');
    return;
  }

  const pulse = collect();
  if (argv.includes('--json')) console.log(JSON.stringify(pulse, null, 2));
  else printReport(pulse);
}

main();
