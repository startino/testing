// Co-located test suite for the RFC-4180 CSV codec.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from this module dir or the repo root):  npm test
// (alias for `node --test`).
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// Every input/expectation lives ONCE in ./fixtures.mjs; this file only asserts.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARSE_CASES,
  STRINGIFY_CASES,
  ROUND_TRIP,
  BAD_PARSE,
  BAD_STRINGIFY,
} from './fixtures.mjs';
import { parse, stringify } from './csv.mjs';

// 1. Reader: each CSV string parses to the exact expected rows (arrays, or
//    objects in header mode). Covers RFC essentials + tolerances + TSV + header.
for (const { name, input, opts, expected } of PARSE_CASES) {
  test(`parse: ${name}`, () => {
    assert.deepEqual(parse(input, opts), expected);
  });
}

// 2. Writer: each row set serialises to the exact canonical CSV string (minimal
//    quoting, quote doubling, CRLF joins with no trailing separator, header).
for (const { name, rows, opts, expected } of STRINGIFY_CASES) {
  test(`stringify: ${name}`, () => {
    assert.equal(stringify(rows, opts), expected);
  });
}

// 3. Round-trip law: parse(stringify(rows)) deep-equals rows for every
//    string-celled shape, including cells that force quoting and header objects.
for (const { name, rows, opts } of ROUND_TRIP) {
  test(`round-trip: ${name}`, () => {
    assert.deepEqual(parse(stringify(rows, opts), opts), rows);
  });
}

// 4. Fail-closed reader: any non-string input or invalid delimiter returns `[]`
//    and never throws.
for (const { name, input, opts } of BAD_PARSE) {
  test(`fail-closed parse: ${name}`, () => {
    assert.doesNotThrow(() => parse(input, opts));
    assert.deepEqual(parse(input, opts), []);
  });
}

// 5. Fail-closed writer: any non-array rows, empty rows, or invalid delimiter
//    returns `""` and never throws.
for (const { name, rows, opts } of BAD_STRINGIFY) {
  test(`fail-closed stringify: ${name}`, () => {
    assert.doesNotThrow(() => stringify(rows, opts));
    assert.equal(stringify(rows, opts), '');
  });
}

// 6. Return types are total: parse is always an array, stringify always a string,
//    across a hostile input grid — never any other type, never a throw.
test('parse return type is always an array, never throws', () => {
  const hostile = ['', 'a,b', '"x', null, undefined, 42, {}, [], true, 'a\r\nb'];
  for (const input of hostile) {
    let out;
    assert.doesNotThrow(() => {
      out = parse(input);
    });
    assert.ok(Array.isArray(out));
  }
});

test('stringify return type is always a string, never throws', () => {
  const hostile = [null, undefined, 42, 'x', {}, [], [['a']], [{ a: '1' }]];
  for (const rows of hostile) {
    let out;
    assert.doesNotThrow(() => {
      out = stringify(rows);
    });
    assert.equal(typeof out, 'string');
  }
});

// 7. Purity: neither function mutates its inputs. A frozen input proves nothing
//    is written back to it (a write would throw in strict mode).
test('pure: parse does not mutate its arguments', () => {
  const opts = Object.freeze({ delimiter: ',', header: true });
  assert.doesNotThrow(() => parse('a,b\r\n1,2', opts));
});

test('pure: stringify does not mutate its row/opts arguments', () => {
  const rows = Object.freeze([Object.freeze(['a,b', 'c']), Object.freeze(['d', 'e'])]);
  const opts = Object.freeze({ delimiter: ',' });
  assert.doesNotThrow(() => stringify(rows, opts));
  assert.equal(stringify(rows, opts), '"a,b",c\r\nd,e');
});

// 8. Strict quoting invariant: the writer quotes a field IFF it contains the
//    delimiter, a quote, CR, or LF — and quoting always round-trips. This pins
//    "minimal quoting" as a contract, not an accident.
test('minimal quoting: only special-bearing fields are quoted', () => {
  assert.equal(stringify([['plain']]), 'plain'); // no quotes
  assert.equal(stringify([['has space']]), 'has space'); // spaces are NOT special
  assert.equal(stringify([['has,comma']]), '"has,comma"');
  assert.equal(stringify([['has"quote']]), '"has""quote"');
  assert.equal(stringify([['has\nlf']]), '"has\nlf"');
  assert.equal(stringify([['has\rcr']]), '"has\rcr"');
  // and each quoted form re-parses to the original cell
  for (const cell of ['plain', 'has space', 'has,comma', 'has"quote', 'has\nlf', 'has\rcr']) {
    assert.deepEqual(parse(stringify([[cell]])), [[cell]]);
  }
});
