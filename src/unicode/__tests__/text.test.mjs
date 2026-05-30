// Co-located test suite for the Unicode text module.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps).
// Exact command (run from the repo root):  npm test   (alias for `node --test`)
//
// NOTE on the runner: `node --test <DIRECTORY>` FAILS on Node 24 with
// MODULE_NOT_FOUND. Use bare `node --test` (cwd auto-discovery of *.test.mjs),
// an explicit glob, or an explicit file path — never a bare directory argument.
//
// The seed string is imported from ../fixtures.mjs (defined ONCE there). Where an
// assertion hinges on a specific typographic code point, the \u escape is used so
// the intent is unambiguous and editor/byte-safe.

import test from "node:test";
import assert from "node:assert/strict";

import { SEED } from "../fixtures.mjs";
import {
  processText,
  validateUtf8,
  graphemeLength,
  graphemeSlice,
} from "../text.mjs";

// 1. Round-trip integrity — processText output equals the NFC-normalized input,
//    which (SEED already being NFC) is also byte-for-byte the original string.
test("round-trip integrity: processText(SEED) === NFC(SEED)", () => {
  assert.equal(processText(SEED), SEED.normalize("NFC"));
});

// 2. Emoji grapheme count — each emoji is ONE grapheme cluster, not 2/3/4
//    (🎉 is 2 UTF-16 units; a naive String.length would wrongly report 2).
test("emoji grapheme count: ☕ and 🎉 are length 1", () => {
  assert.equal(graphemeLength("☕"), 1); // ☕ U+2615
  assert.equal(graphemeLength("\u{1F389}"), 1); // 🎉 U+1F389
});

// 3. Accented Latin preservation — each accented word survives NFC→NFC, with no
//    folding to ASCII (no "Jurgen"/"cafe"/"resume"/"naive"/"Hotel").
test("accented Latin preservation: accents survive unchanged", () => {
  const out = processText(SEED);
  for (const word of ["Jürgen", "Müller", "café", "résumé", "naïve", "Hôtel"]) {
    assert.ok(
      out.includes(word.normalize("NFC")),
      `expected output to contain "${word}"`,
    );
  }
});

// 4. Smart-quote preservation — every curly quote PRESENT in the seed is present
//    in the output, and none collapsed to an ASCII straight quote.
//    (The seed has “ U+201C, ” U+201D, ’ U+2019 but NO ‘ U+2018, so we only
//    assert the marks that actually appear — per the "when present" clause.)
test("smart-quote preservation: curly quotes intact, no ASCII collapse", () => {
  const out = processText(SEED);
  for (const ch of ["“", "”", "’"]) {
    assert.ok(out.includes(ch), `expected output to contain U+${ch.codePointAt(0).toString(16)}`);
  }
  // No curly → straight collapse: count of ASCII double/single quotes is unchanged (0).
  const straightDouble = (s) => (s.match(/"/g) || []).length;
  const straightSingle = (s) => (s.match(/'/g) || []).length;
  assert.equal(straightDouble(out), straightDouble(SEED));
  assert.equal(straightSingle(out), straightSingle(SEED));
});

// 5. Em dash preservation — — (U+2014) is neither stripped nor replaced by "-".
test("em dash preservation: — (U+2014) is not stripped or replaced", () => {
  const out = processText(SEED);
  assert.ok(out.includes("—"), "expected output to contain em dash U+2014");
  const emCount = (s) => (s.match(/—/g) || []).length;
  assert.equal(emCount(out), emCount(SEED)); // same number of em dashes, none lost
});

// 6. O’Brien’s apostrophe — the curly apostrophe ’ (U+2019) inside O’Brien’s
//    survives unchanged and is not collapsed to ASCII '.
test("O’Brien’s apostrophe: curly ’ (U+2019) survives", () => {
  const out = processText(SEED);
  assert.ok(out.includes("O’Brien’s"), "expected output to contain O’Brien’s with curly apostrophes");
});

// --- Optional property guards (not required by the spec, cheap, high value) ---

// NFC idempotency — pins the purity/idempotency property: f(f(x)) === f(x).
test("processText is idempotent on the seed", () => {
  assert.equal(processText(processText(SEED)), processText(SEED));
});

// validateUtf8 — exercises both branches: well-formed seed is valid; a lone
// surrogate is not.
test("validateUtf8: well-formed string valid, lone surrogate invalid", () => {
  assert.equal(validateUtf8(SEED), true);
  assert.equal(validateUtf8("\uD800"), false); // unpaired high surrogate
});

// graphemeSlice — grapheme-aware slicing never bisects the trailing emoji.
test("graphemeSlice: last grapheme of the seed is the 🎉 emoji", () => {
  const n = graphemeLength(SEED);
  assert.equal(graphemeSlice(SEED, n - 1), "\u{1F389}"); // 🎉
});
