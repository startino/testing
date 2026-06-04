// Co-located test suite for the feature-flags (testing sandbox) module.
//
// "feature flag" here means feature flag (testing sandbox) — a fail-closed
// boolean read once at process start. It is NEVER the Station product feature
// flag (see CONTEXT.md / docs/adr/0001-feature-flags-as-zero-dep-library.md).
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from inside src/flags/):  node --test
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// THE `?bust=` IDIOM (why this suite re-imports): flags.mjs reads `process.env`
// ONCE, at module evaluation, into an immutable boot snapshot. To exercise a
// different boot environment per case we must force a FRESH module instance:
// `await import("../flags.mjs?bust=<n>")` gives a distinct module URL, so the ESM
// loader re-evaluates the module and re-snapshots `process.env`. A monotonic
// counter guarantees a never-before-seen URL per boot. We set/restore the
// relevant `process.env` keys around EACH case so no test leaks env state into
// the next (the config itself is a pure literal, so it is value-identical across
// instances; only the env read differs). Tests assert EXTERNAL behavior only —
// the boolean `isEnabled` returns for a given (config, boot-time env) — never an
// internal helper, module layout, or parse internal.

import test from "node:test";
import assert from "node:assert/strict";

import {
  KNOWN_ENV,
  ABSENT_ENV,
  ENABLED_IN_KNOWN_ENV,
  DISABLED_IN_KNOWN_ENV,
  UNKNOWN_FLAG,
  GARBAGE_OVERRIDE_VALUES,
  TRUTHY_OVERRIDE_VALUES,
} from "../fixtures.mjs";

let bustCounter = 0;

/**
 * Boot a FRESH instance of flags.mjs under a precise environment, run `body`
 * with its `isEnabled`, then restore every env key touched — so no case leaks
 * boot state into the next.
 *
 * @param {Record<string, string|undefined>} env keys to set for this boot;
 *   `undefined` means "ensure absent". `FLAGS_ENV` and any `FLAG_*` keys go here.
 * @param {(isEnabled: (name: string) => boolean) => void|Promise<void>} body
 */
async function withBootEnv(env, body) {
  const keys = Object.keys(env);
  const saved = new Map(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    const { isEnabled } = await import(`../flags.mjs?bust=${bustCounter++}`);
    await body(isEnabled);
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// Required #1 — a FLAG_<NAME> truthy override beats the FLAGS_ENV-selected config
// default (layer 1 over layer 2). The flag is `false` in the selected env, yet
// the override forces it on.
test("FLAG_<NAME> truthy override beats the config default (layer 1 > 2)", async () => {
  await withBootEnv(
    {
      FLAGS_ENV: KNOWN_ENV,
      [`FLAG_${DISABLED_IN_KNOWN_ENV.toUpperCase()}`]: "1",
    },
    (isEnabled) => {
      assert.equal(isEnabled(DISABLED_IN_KNOWN_ENV), true);
    },
  );
});

// Required #2 — the FLAGS_ENV-selected config default applies when no override is
// present (layer 2). The flag is `true` in the selected env and resolves true.
test("FLAGS_ENV config default applies when no override present (layer 2)", async () => {
  await withBootEnv(
    {
      FLAGS_ENV: KNOWN_ENV,
      [`FLAG_${ENABLED_IN_KNOWN_ENV.toUpperCase()}`]: undefined,
    },
    (isEnabled) => {
      assert.equal(isEnabled(ENABLED_IN_KNOWN_ENV), true);
    },
  );
});

// Required #3 — an unknown / typo'd flag resolves to false (fail-closed floor),
// even under a valid FLAGS_ENV with no matching override.
test("unknown / typo'd flag resolves to false (fail-closed floor)", async () => {
  await withBootEnv(
    {
      FLAGS_ENV: KNOWN_ENV,
      [`FLAG_${UNKNOWN_FLAG.toUpperCase()}`]: undefined,
    },
    (isEnabled) => {
      assert.equal(isEnabled(UNKNOWN_FLAG), false);
    },
  );
});

// Required #4 — a non-truthy / garbage FLAG_<NAME> resolves to false (fail-closed
// parse), and a PRESENT non-truthy override force-offs even a `true` config
// default. Never Boolean("false") === true.
test("garbage FLAG_<NAME> resolves to false, force-off beats a true default", async () => {
  for (const value of GARBAGE_OVERRIDE_VALUES) {
    await withBootEnv(
      {
        FLAGS_ENV: KNOWN_ENV,
        // ENABLED_IN_KNOWN_ENV is `true` in the config; a non-truthy override
        // must still drive it to false.
        [`FLAG_${ENABLED_IN_KNOWN_ENV.toUpperCase()}`]: value,
      },
      (isEnabled) => {
        assert.equal(
          isEnabled(ENABLED_IN_KNOWN_ENV),
          false,
          `garbage override ${JSON.stringify(value)} must resolve false`,
        );
      },
    );
  }
});

// Required #5 — a FLAGS_ENV naming an env ABSENT from the config resolves ALL
// flags to false and does NOT throw.
test("FLAGS_ENV naming an absent env => all flags false, no throw", async () => {
  await withBootEnv(
    {
      FLAGS_ENV: ABSENT_ENV,
      [`FLAG_${ENABLED_IN_KNOWN_ENV.toUpperCase()}`]: undefined,
      [`FLAG_${DISABLED_IN_KNOWN_ENV.toUpperCase()}`]: undefined,
    },
    (isEnabled) => {
      // Flags that would be true under a known env are all false here.
      assert.equal(isEnabled(ENABLED_IN_KNOWN_ENV), false);
      assert.equal(isEnabled(DISABLED_IN_KNOWN_ENV), false);
      assert.equal(isEnabled(UNKNOWN_FLAG), false);
    },
  );
});

// --- Rounding out the total fail-closed matrix (cheap, high value) ---

// FLAGS_ENV unset => all flags false, no throw.
test("FLAGS_ENV unset => all flags false, no throw", async () => {
  await withBootEnv(
    {
      FLAGS_ENV: undefined,
      [`FLAG_${ENABLED_IN_KNOWN_ENV.toUpperCase()}`]: undefined,
    },
    (isEnabled) => {
      assert.equal(isEnabled(ENABLED_IN_KNOWN_ENV), false);
    },
  );
});

// Each truthy token (mixed case + whitespace) enables via the override layer,
// even with FLAGS_ENV unset (override does not require a config default).
test("truthy tokens enable via override regardless of case/whitespace", async () => {
  for (const value of TRUTHY_OVERRIDE_VALUES) {
    await withBootEnv(
      {
        FLAGS_ENV: undefined,
        [`FLAG_${UNKNOWN_FLAG.toUpperCase()}`]: value,
      },
      (isEnabled) => {
        // Override is authoritative; a truthy FLAG_ enables even a flag declared
        // in NO config env.
        assert.equal(
          isEnabled(UNKNOWN_FLAG),
          true,
          `truthy override ${JSON.stringify(value)} must resolve true`,
        );
      },
    );
  }
});

// Read-once-at-boot for the FLAG_ layer: a post-boot mutation of
// `process.env.FLAG_<NAME>` is NOT observed by an already-loaded module instance.
// The override key is ABSENT at boot (so layer 1 abstains and the false config
// default holds); setting it truthy AFTER import must not flip the same instance.
test("post-boot FLAG_<NAME> mutation is not observed (read-once-at-boot)", async () => {
  const overrideKey = `FLAG_${DISABLED_IN_KNOWN_ENV.toUpperCase()}`;
  await withBootEnv(
    {
      FLAGS_ENV: KNOWN_ENV,
      [overrideKey]: undefined, // absent at boot -> config default (false) holds
    },
    (isEnabled) => {
      assert.equal(isEnabled(DISABLED_IN_KNOWN_ENV), false);
      // Mutate the live global AFTER the module was evaluated. withBootEnv saved
      // and will restore this key, so the mutation does not leak to other cases.
      process.env[overrideKey] = "1";
      // Same already-booted instance must STILL read its immutable boot snapshot.
      assert.equal(
        isEnabled(DISABLED_IN_KNOWN_ENV),
        false,
        "a FLAG_ override set after boot must not be observed by a loaded instance",
      );
    },
  );
});

// A non-string / undefined name is fail-closed false and never throws.
test("non-string name => false, no throw", async () => {
  await withBootEnv({ FLAGS_ENV: KNOWN_ENV }, (isEnabled) => {
    assert.equal(isEnabled(undefined), false);
    assert.equal(isEnabled(123), false);
    assert.equal(isEnabled(null), false);
    assert.equal(isEnabled({}), false);
    assert.equal(isEnabled(ENABLED_IN_KNOWN_ENV.toUpperCase()), false); // wrong-case name is not the identifier
  });
});
