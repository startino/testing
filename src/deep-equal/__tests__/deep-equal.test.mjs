import test from "node:test";
import assert from "node:assert/strict";

import { deepEqual } from "../deep-equal.mjs";
import {
  FORGED_TAGS,
  GRAPH_CASES,
  UNSUPPORTED_BUILDERS,
  VALUE_CASES,
} from "../fixtures.mjs";

for (const { name, a, b, equal } of VALUE_CASES) {
  test(name, () => {
    assert.equal(deepEqual(a, b), equal);
    assert.equal(deepEqual(b, a), equal);
    assert.equal(deepEqual(a, a), true);
    assert.equal(deepEqual(b, b), true);
  });
}

for (const { name, build, equal } of GRAPH_CASES) {
  test(name, () => {
    const { a, b } = build();
    assert.equal(deepEqual(a, b), equal);
    assert.equal(deepEqual(b, a), equal);
    assert.equal(deepEqual(a, a), true);
    assert.equal(deepEqual(b, b), true);
  });
}

for (const [name, build] of UNSUPPORTED_BUILDERS) {
  test(`${name} is identity-only`, () => {
    const a = build();
    const b = build();
    assert.equal(deepEqual(a, a), true);
    assert.equal(deepEqual(a, b), false);
    assert.equal(deepEqual(b, a), false);
  });
}

for (const tag of FORGED_TAGS) {
  test(`forged ${tag} tag remains an ordinary object`, () => {
    const a = { [Symbol.toStringTag]: tag, value: { x: 1 } };
    const b = { [Symbol.toStringTag]: tag, value: { x: 1 } };
    assert.equal(deepEqual(a, b), true);
    b.value.x = 2;
    assert.equal(deepEqual(a, b), false);
  });
}

test("typed views compare content independent of surrounding buffer bytes", () => {
  const leftBuffer = Uint8Array.from([8, 1, 2, 9]);
  const rightBuffer = Uint8Array.from([7, 1, 2, 6]);
  assert.equal(
    deepEqual(leftBuffer.subarray(1, 3), rightBuffer.subarray(1, 3)),
    true,
  );
});

test("representative transitivity", () => {
  const build = () => {
    const root = { items: new Set([{ x: 1 }, { x: 2 }]) };
    root.self = root;
    return root;
  };
  const a = build();
  const b = build();
  const c = build();
  assert.equal(deepEqual(a, b), true);
  assert.equal(deepEqual(b, c), true);
  assert.equal(deepEqual(a, c), true);
});
