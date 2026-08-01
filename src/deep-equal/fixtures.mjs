// Reusable behavioral fixtures for the library and its web adapter.

const sharedSymbol = Symbol("shared");
const otherSymbol = Symbol("other");
const sharedFunction = () => 1;

/** @template {object} T @param {T} value @param {PropertyKey} key @param {unknown} propertyValue @returns {T} */
const enumerable = (value, key, propertyValue) => {
  Object.defineProperty(value, key, {
    value: propertyValue,
    enumerable: true,
    writable: true,
  });
  return value;
};

/** @template {object} T @param {T} value @param {PropertyKey} key @param {unknown} propertyValue @returns {T} */
const nonEnumerable = (value, key, propertyValue) => {
  Object.defineProperty(value, key, {
    value: propertyValue,
    enumerable: false,
  });
  return value;
};

class Point {
  /** @param {number} x */
  constructor(x) {
    this.x = x;
  }
}
class OtherPoint {
  /** @param {number} x */
  constructor(x) {
    this.x = x;
  }
}

/** Flat cases whose values are safe to reuse. */
export const VALUE_CASES = Object.freeze([
  { name: "equal number", a: 1, b: 1, equal: true },
  { name: "unequal number", a: 1, b: 2, equal: false },
  { name: "NaN", a: NaN, b: NaN, equal: true },
  { name: "signed zero", a: 0, b: -0, equal: true },
  { name: "BigInt", a: 10n, b: 10n, equal: true },
  { name: "primitive type mismatch", a: 10n, b: 10, equal: false },
  { name: "symbol identity", a: sharedSymbol, b: sharedSymbol, equal: true },
  { name: "distinct symbols", a: sharedSymbol, b: otherSymbol, equal: false },
  {
    name: "function identity",
    a: sharedFunction,
    b: sharedFunction,
    equal: true,
  },
  { name: "distinct functions", a: () => 1, b: () => 1, equal: false },
  {
    name: "nested object",
    a: { list: [1, { ok: true }] },
    b: { list: [1, { ok: true }] },
    equal: true,
  },
  {
    name: "nested difference",
    a: { list: [1, { ok: true }] },
    b: { list: [1, { ok: false }] },
    equal: false,
  },
  {
    name: "object key order",
    a: { a: 1, b: 2 },
    b: { b: 2, a: 1 },
    equal: true,
  },
  {
    name: "missing versus undefined",
    a: {},
    b: { value: undefined },
    equal: false,
  },
  {
    name: "enumerable symbol",
    a: { [sharedSymbol]: { x: 1 } },
    b: { [sharedSymbol]: { x: 1 } },
    equal: true,
  },
  {
    name: "different symbol keys",
    a: { [sharedSymbol]: 1 },
    b: { [otherSymbol]: 1 },
    equal: false,
  },
  {
    name: "ignore non-enumerable",
    a: nonEnumerable({ x: 1 }, "hidden", 1),
    b: nonEnumerable({ x: 1 }, "hidden", 2),
    equal: true,
  },
  {
    name: "null prototypes",
    a: Object.assign(Object.create(null), { x: 1 }),
    b: Object.assign(Object.create(null), { x: 1 }),
    equal: true,
  },
  {
    name: "null versus Object prototype",
    a: Object.assign(Object.create(null), { x: 1 }),
    b: { x: 1 },
    equal: false,
  },
  {
    name: "same class prototype",
    a: new Point(1),
    b: new Point(1),
    equal: true,
  },
  {
    name: "different class prototypes",
    a: new Point(1),
    b: new OtherPoint(1),
    equal: false,
  },
  { name: "array order", a: [1, 2], b: [2, 1], equal: false },
  { name: "array length", a: [1], b: [1, undefined], equal: false },
  {
    name: "array string property",
    a: enumerable([1], "note", { x: 1 }),
    b: enumerable([1], "note", { x: 1 }),
    equal: true,
  },
  {
    name: "array symbol property",
    a: enumerable([1], sharedSymbol, 2),
    b: enumerable([1], sharedSymbol, 3),
    equal: false,
  },
  { name: "valid dates", a: new Date(100), b: new Date(100), equal: true },
  { name: "different dates", a: new Date(100), b: new Date(101), equal: false },
  { name: "invalid dates", a: new Date(NaN), b: new Date(NaN), equal: true },
  { name: "regexp", a: /ab/gi, b: /ab/gi, equal: true },
  { name: "regexp source", a: /ab/g, b: /ac/g, equal: false },
  { name: "regexp flags", a: /ab/g, b: /ab/i, equal: false },
  {
    name: "integer typed array",
    a: new Uint8Array([1, 2]),
    b: new Uint8Array([1, 2]),
    equal: true,
  },
  {
    name: "typed content",
    a: new Uint8Array([1, 2]),
    b: new Uint8Array([1, 3]),
    equal: false,
  },
  {
    name: "typed length",
    a: new Uint8Array([1]),
    b: new Uint8Array([1, 0]),
    equal: false,
  },
  {
    name: "typed brand",
    a: new Uint8Array([1]),
    b: new Int8Array([1]),
    equal: false,
  },
  {
    name: "float SameValueZero",
    a: new Float64Array([NaN, 0]),
    b: new Float64Array([NaN, -0]),
    equal: true,
  },
  {
    name: "BigInt typed array",
    a: new BigInt64Array([1n, -2n]),
    b: new BigInt64Array([1n, -2n]),
    equal: true,
  },
  {
    name: "unordered primitive map",
    a: new Map([
      ["a", 1],
      ["b", 2],
    ]),
    b: new Map([
      ["b", 2],
      ["a", 1],
    ]),
    equal: true,
  },
  {
    name: "structural map key",
    a: new Map([[{ id: 1 }, { x: 2 }]]),
    b: new Map([[{ id: 1 }, { x: 2 }]]),
    equal: true,
  },
  {
    name: "map value mismatch",
    a: new Map([[{ id: 1 }, 2]]),
    b: new Map([[{ id: 1 }, 3]]),
    equal: false,
  },
  {
    name: "unordered set",
    a: new Set([{ x: 1 }, { x: 2 }]),
    b: new Set([{ x: 2 }, { x: 1 }]),
    equal: true,
  },
  {
    name: "set mismatch",
    a: new Set([{ x: 1 }]),
    b: new Set([{ x: 2 }]),
    equal: false,
  },
]);

/** Builders for graphs or descriptors that must be fresh on every assertion. */
export const GRAPH_CASES = Object.freeze([
  {
    name: "array hole differs from undefined",
    equal: false,
    build: () => ({ a: Array(1), b: [undefined] }),
  },
  {
    name: "regexp lastIndex",
    equal: false,
    build: () => {
      const a = /x/g;
      const b = /x/g;
      a.lastIndex = 1;
      return { a, b };
    },
  },
  {
    name: "regexp enumerable property",
    equal: false,
    build: () => ({
      a: enumerable(/x/, "note", 1),
      b: enumerable(/x/, "note", 2),
    }),
  },
  {
    name: "typed arrays ignore buffers and offsets",
    equal: true,
    build: () => ({
      a: new Uint8Array(Uint8Array.from([9, 1, 2, 9]).buffer, 1, 2),
      b: new Uint8Array(Uint8Array.from([1, 2]).buffer),
    }),
  },
  {
    name: "typed array enumerable property",
    equal: false,
    build: () => ({
      a: enumerable(new Uint8Array([1]), "note", 1),
      b: enumerable(new Uint8Array([1]), "note", 2),
    }),
  },
  {
    name: "self cycle",
    equal: true,
    build: () => {
      const a = /** @type {{ name: string, self?: unknown }} */ ({
        name: "node",
      });
      const b = /** @type {{ name: string, self?: unknown }} */ ({
        name: "node",
      });
      a.self = a;
      b.self = b;
      return { a, b };
    },
  },
  {
    name: "mutual cycle",
    equal: true,
    build: () => {
      const a = {};
      const aChild = { parent: a };
      a.child = aChild;
      const b = {};
      const bChild = { parent: b };
      b.child = bChild;
      return { a, b };
    },
  },
  {
    name: "unequal cycle shape",
    equal: false,
    build: () => {
      const a = {};
      a.next = a;
      const b = {};
      b.next = { next: b };
      return { a, b };
    },
  },
  {
    name: "shared alias differs from duplicate",
    equal: false,
    build: () => {
      const shared = { value: 1 };
      return {
        a: { first: shared, second: shared },
        b: { first: { value: 1 }, second: { value: 1 } },
      };
    },
  },
  {
    name: "overlapping identity cannot remap",
    equal: false,
    build: () => {
      const common = { value: 1 };
      return {
        a: { first: common, second: common },
        b: { first: common, second: { value: 1 } },
      };
    },
  },
  {
    name: "map key value alias",
    equal: true,
    build: () => {
      const left = { id: 1 };
      const right = { id: 1 };
      return { a: new Map([[left, left]]), b: new Map([[right, right]]) };
    },
  },
  {
    name: "map key value alias mismatch",
    equal: false,
    build: () => {
      const left = { id: 1 };
      return {
        a: new Map([[left, left]]),
        b: new Map([[{ id: 1 }, { id: 1 }]]),
      };
    },
  },
  {
    name: "ambiguous map needs backtracking",
    equal: true,
    build: () => {
      const a1 = { id: 1 };
      const a2 = { id: 1 };
      const b1 = { id: 1 };
      const b2 = { id: 1 };
      return {
        a: new Map([
          [a1, { ref: a2 }],
          [a2, { ref: a2 }],
        ]),
        b: new Map([
          [b1, { ref: b1 }],
          [b2, { ref: b1 }],
        ]),
      };
    },
  },
  {
    name: "ambiguous set needs rollback",
    equal: true,
    build: () => {
      const a1 = { id: 1 };
      const a2 = { id: 1, ref: a1 };
      const b1 = { id: 1 };
      const b2 = { id: 1, ref: b1 };
      return { a: new Set([a1, a2]), b: new Set([b2, b1]) };
    },
  },
  {
    name: "cyclic map",
    equal: true,
    build: () => {
      const a = new Map();
      const b = new Map();
      a.set("self", a);
      b.set("self", b);
      return { a, b };
    },
  },
  {
    name: "cyclic set",
    equal: true,
    build: () => {
      const a = new Set();
      const b = new Set();
      a.add(a);
      b.add(b);
      return { a, b };
    },
  },
]);

/** Unsupported exotic builders; distinct instances are identity-only. */
export const UNSUPPORTED_BUILDERS = Object.freeze([
  ["ArrayBuffer", () => new ArrayBuffer(2)],
  ["DataView", () => new DataView(new ArrayBuffer(2))],
  ["Error", () => new Error("x")],
  ["WeakMap", () => new WeakMap()],
  ["WeakSet", () => new WeakSet()],
  ["Promise", () => Promise.resolve(1)],
]);

/** Forgeable tags must not grant an object a supported built-in brand. */
export const FORGED_TAGS = Object.freeze([
  "Date",
  "RegExp",
  "Map",
  "Set",
  "Uint8Array",
]);
