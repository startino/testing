// Co-located test suite for the id module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every fixture value lives ONCE in ../fixtures.mjs; this file only asserts.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_ALPHABET_RE,
  INVALID_SIZES,
  INVALID_ALPHABETS,
  CUSTOM_CASES,
} from '../fixtures.mjs';
import { newId, customAlphabet, DEFAULT_ALPHABET, DEFAULT_SIZE } from '../id.mjs';

// 1. Length: default is 21; newId(n) returns exactly n.
test('newId() default length is DEFAULT_SIZE (21)', () => {
  assert.equal(newId().length, DEFAULT_SIZE);
  assert.equal(newId().length, 21);
});

test('newId(n) returns exactly length n', () => {
  for (const n of [1, 2, 5, 16, 21, 40, 128]) {
    assert.equal(newId(n).length, n);
  }
});

// 2. Only URL-safe chars appear across many draws.
test('newId() only ever emits URL-safe chars', () => {
  for (let i = 0; i < 1000; i++) {
    assert.match(newId(), DEFAULT_ALPHABET_RE);
  }
});

// 3. Zero collisions across a large draw.
test('100_000 ids are all distinct (no collisions)', () => {
  const N = 100_000;
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(newId());
  assert.equal(seen.size, N);
});

// 4. customAlphabet property cases + factory defaultSize honoured.
test('customAlphabet: ids honour length + alphabet for every case', () => {
  for (const { name, alphabet, size, exact } of CUSTOM_CASES) {
    const gen = customAlphabet(alphabet, size);
    const id = gen();
    assert.equal(id.length, size, `${name}: length`);
    for (const ch of id) {
      assert.ok(alphabet.includes(ch), `${name}: char "${ch}" not in alphabet`);
    }
    if (exact !== undefined) {
      assert.equal(id, exact, `${name}: exact deterministic output`);
    }
  }
});

test("customAlphabet: generator honours its own defaultSize when called with no arg", () => {
  const gen = customAlphabet('abcdef', 7);
  assert.equal(gen().length, 7);
  // An explicit size overrides the factory default.
  assert.equal(gen(3).length, 3);
});

// 5. Invalid args throw TypeError; undefined size is valid.
test('newId(badSize) throws TypeError for every invalid size', () => {
  for (const bad of INVALID_SIZES) {
    assert.throws(() => newId(bad), TypeError, `size ${String(bad)} should throw`);
  }
});

test('customAlphabet(badAlphabet) throws TypeError for every invalid alphabet', () => {
  for (const { name, value } of INVALID_ALPHABETS) {
    assert.throws(() => customAlphabet(value), TypeError, `${name} should throw`);
  }
});

test('newId(undefined) does NOT throw and has default length 21', () => {
  let out;
  assert.doesNotThrow(() => {
    out = newId(undefined);
  });
  assert.equal(out.length, 21);
});

// 6. Derives from the CSPRNG (globalThis.crypto). Stub the global, assert
//    deterministic output, restore in a finally so no later test is polluted.
test('output derives from globalThis.crypto.getRandomValues', () => {
  const orig = globalThis.crypto;

  // (a) All-zero bytes: every masked index is 0 -> DEFAULT_ALPHABET[0] ('A').
  try {
    const zeroStub = {
      getRandomValues(arr) {
        arr.fill(0);
        return arr;
      },
    };
    Object.defineProperty(globalThis, 'crypto', { value: zeroStub, configurable: true });
    assert.equal(newId(10), DEFAULT_ALPHABET[0].repeat(10));
    assert.equal(newId(10), 'AAAAAAAAAA');
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: orig, configurable: true });
  }

  // (b) Counter stub 0,1,2,3,...: byte i maps to alphabet[i] (mask 63, so no
  //     rejection over the 64-symbol default) -> first `size` chars of the
  //     alphabet in order.
  try {
    let counter = 0;
    const counterStub = {
      getRandomValues(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = counter++ & 0xff;
        return arr;
      },
    };
    Object.defineProperty(globalThis, 'crypto', { value: counterStub, configurable: true });
    assert.equal(newId(5), DEFAULT_ALPHABET.slice(0, 5));
    assert.equal(newId(5).length, 5);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: orig, configurable: true });
  }

  // Global was restored: real CSPRNG is back and still produces valid ids.
  assert.equal(globalThis.crypto, orig);
  assert.match(newId(), DEFAULT_ALPHABET_RE);
});
