// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the deepEqual test cases. Each case is defined ONCE
// here and imported by the test suite — the test file only asserts, never
// constructs inputs. Cases are split by the concern each proves:
//
//   CASES        — flat { name, a, b, equal } table: for each, deepEqual(a, b)
//                  must equal `equal`. Covers primitives, collections, exotics —
//                  every branch of the contract, with BOTH true and false
//                  outcomes so a branch that always-returns-true can't hide.
//   CYCLIC_CASES — self-referential structures. These CANNOT be table literals
//                  (a literal cannot point at itself), so each is a thunk that
//                  builds a fresh { a, b } pair with the cycle wired in.
//   FUNCTION_CASES — identity semantics for functions, which likewise need live
//                  references rather than serialisable literals.
//
// Note: `equal` is symmetric under the contract, so the suite asserts both
// deepEqual(a, b) and deepEqual(b, a) for every case — a fixture only states the
// pair once.

// A couple of shared symbols so "same enumerable symbol key" cases reference the
// SAME symbol on both sides (symbols are only equal by identity).
const SYM = Symbol("shared");
const SYM_OTHER = Symbol("other");

/**
 * Flat comparison table. deepEqual(a, b) === equal for each row.
 *
 * @type {ReadonlyArray<{ name: string, a: unknown, b: unknown, equal: boolean }>}
 */
export const CASES = Object.freeze([
  // ---- primitives & identity (SameValueZero) ----
  { name: "equal numbers", a: 1, b: 1, equal: true },
  { name: "unequal numbers", a: 1, b: 2, equal: false },
  { name: "NaN equals NaN", a: NaN, b: NaN, equal: true },
  { name: "NaN vs number", a: NaN, b: 0, equal: false },
  { name: "+0 equals -0", a: +0, b: -0, equal: true },
  { name: "equal strings", a: "x", b: "x", equal: true },
  { name: "number 0 not string '0'", a: 0, b: "0", equal: false },
  { name: "true equals true", a: true, b: true, equal: true },
  { name: "true not 1", a: true, b: 1, equal: false },
  { name: "null equals null", a: null, b: null, equal: true },
  { name: "undefined equals undefined", a: undefined, b: undefined, equal: true },
  { name: "null vs undefined", a: null, b: undefined, equal: false },
  { name: "null vs object", a: null, b: {}, equal: false },
  { name: "same symbol", a: SYM, b: SYM, equal: true },
  { name: "different symbols", a: SYM, b: SYM_OTHER, equal: false },
  { name: "equal bigints", a: 10n, b: 10n, equal: true },
  { name: "bigint not number", a: 10n, b: 10, equal: false },

  // ---- nested objects & arrays ----
  { name: "equal nested objects", a: { x: { y: 1 } }, b: { x: { y: 1 } }, equal: true },
  { name: "nested object one field differs", a: { x: { y: 1 } }, b: { x: { y: 2 } }, equal: false },
  { name: "key order independent", a: { x: 1, y: 2 }, b: { y: 2, x: 1 }, equal: true },
  { name: "extra key on b", a: { x: 1 }, b: { x: 1, y: 2 }, equal: false },
  { name: "missing key on b", a: { x: 1, y: 2 }, b: { x: 1 }, equal: false },
  { name: "same key count, different key name", a: { x: 1 }, b: { y: 1 }, equal: false },
  { name: "equal arrays", a: [1, 2, 3], b: [1, 2, 3], equal: true },
  { name: "array element differs", a: [1, 2, 3], b: [1, 9, 3], equal: false },
  { name: "array length differs", a: [1, 2], b: [1, 2, 3], equal: false },
  { name: "array vs object (tag gate)", a: [1], b: { 0: 1, length: 1 }, equal: false },
  { name: "deeply nested mixed equal", a: { a: [1, { b: [2, 3] }] }, b: { a: [1, { b: [2, 3] }] }, equal: true },
  { name: "deeply nested mixed differs", a: { a: [1, { b: [2, 3] }] }, b: { a: [1, { b: [2, 4] }] }, equal: false },
  { name: "nested NaN equal", a: { v: [NaN] }, b: { v: [NaN] }, equal: true },

  // ---- Date ----
  { name: "equal dates", a: new Date(1000), b: new Date(1000), equal: true },
  { name: "unequal dates", a: new Date(1000), b: new Date(2000), equal: false },
  { name: "two invalid dates equal", a: new Date(NaN), b: new Date(NaN), equal: true },
  { name: "valid vs invalid date", a: new Date(1000), b: new Date(NaN), equal: false },

  // ---- RegExp ----
  { name: "equal regexp", a: /ab+c/gi, b: /ab+c/gi, equal: true },
  { name: "regexp flag order normalised", a: /x/gi, b: /x/ig, equal: true },
  { name: "regexp source differs", a: /ab+c/g, b: /ab*c/g, equal: false },
  { name: "regexp flags differ", a: /x/g, b: /x/gi, equal: false },

  // ---- typed arrays ----
  { name: "equal Uint8Array", a: new Uint8Array([1, 2, 3]), b: new Uint8Array([1, 2, 3]), equal: true },
  { name: "typed array element differs", a: new Uint8Array([1, 2, 3]), b: new Uint8Array([1, 9, 3]), equal: false },
  { name: "typed array length differs", a: new Uint8Array([1, 2]), b: new Uint8Array([1, 2, 3]), equal: false },
  { name: "different typed array type (tag gate)", a: new Uint8Array([1, 2]), b: new Int8Array([1, 2]), equal: false },
  { name: "Float64Array NaN slot equal", a: new Float64Array([NaN, 1]), b: new Float64Array([NaN, 1]), equal: true },

  // ---- Map with primitive AND object members ----
  { name: "equal map primitive keys", a: new Map([["a", 1], ["b", 2]]), b: new Map([["b", 2], ["a", 1]]), equal: true },
  { name: "map different size", a: new Map([["a", 1]]), b: new Map([["a", 1], ["b", 2]]), equal: false },
  { name: "map different value", a: new Map([["a", 1]]), b: new Map([["a", 2]]), equal: false },
  { name: "map object keys equal", a: new Map([[{ id: 1 }, "v"]]), b: new Map([[{ id: 1 }, "v"]]), equal: true },
  { name: "map object keys differ", a: new Map([[{ id: 1 }, "v"]]), b: new Map([[{ id: 2 }, "v"]]), equal: false },
  { name: "map nested value equal", a: new Map([["k", { n: [1] }]]), b: new Map([["k", { n: [1] }]]), equal: true },

  // ---- Set with primitive AND object members ----
  { name: "equal set primitives (unordered)", a: new Set([1, 2, 3]), b: new Set([3, 1, 2]), equal: true },
  { name: "set different size", a: new Set([1, 2]), b: new Set([1, 2, 3]), equal: false },
  { name: "set different member", a: new Set([1, 2]), b: new Set([1, 3]), equal: false },
  { name: "set object members equal", a: new Set([{ id: 1 }, { id: 2 }]), b: new Set([{ id: 2 }, { id: 1 }]), equal: true },
  { name: "set object members differ", a: new Set([{ id: 1 }]), b: new Set([{ id: 2 }]), equal: false },

  // ---- enumerable symbol keys ----
  { name: "equal enumerable symbol keys", a: { [SYM]: 1 }, b: { [SYM]: 1 }, equal: true },
  { name: "symbol key value differs", a: { [SYM]: 1 }, b: { [SYM]: 2 }, equal: false },
  { name: "different symbol keys", a: { [SYM]: 1 }, b: { [SYM_OTHER]: 1 }, equal: false },
  { name: "string + symbol keys equal", a: { x: 1, [SYM]: 2 }, b: { x: 1, [SYM]: 2 }, equal: true },
  { name: "extra symbol key on one side", a: { x: 1 }, b: { x: 1, [SYM]: 2 }, equal: false },
]);

/**
 * Cyclic structures. Each thunk returns a FRESH { a, b } pair with a cycle wired
 * in, plus the expected `equal`. Built lazily so the self-reference exists on a
 * real object (a literal cannot point at itself).
 *
 * @type {ReadonlyArray<{ name: string, build: () => { a: any, b: any }, equal: boolean }>}
 */
export const CYCLIC_CASES = Object.freeze([
  {
    name: "self-referential objects, structurally equal",
    equal: true,
    build() {
      const a = { v: 1 };
      a.self = a;
      const b = { v: 1 };
      b.self = b;
      return { a, b };
    },
  },
  {
    name: "self-referential objects, leaf value differs",
    equal: false,
    build() {
      const a = { v: 1 };
      a.self = a;
      const b = { v: 2 };
      b.self = b;
      return { a, b };
    },
  },
  {
    name: "mutually equal cyclic arrays",
    equal: true,
    build() {
      const a = [1];
      a.push(a);
      const b = [1];
      b.push(b);
      return { a, b };
    },
  },
  {
    name: "cycle shape differs (one self-refs, other points elsewhere)",
    equal: false,
    build() {
      const a = { v: 1 };
      a.next = a; // a.next -> a (cycle back to self)
      const b = { v: 1 };
      b.next = { v: 1, next: null }; // b.next -> a distinct finite node
      return { a, b };
    },
  },
]);

/**
 * Function identity cases. Functions are equal only by reference (=== fast path);
 * two distinct functions are never deep-equal even with identical source.
 *
 * @type {ReadonlyArray<{ name: string, build: () => { a: any, b: any }, equal: boolean }>}
 */
export const FUNCTION_CASES = Object.freeze([
  {
    name: "same function reference",
    equal: true,
    build() {
      const f = () => 1;
      return { a: f, b: f };
    },
  },
  {
    name: "different function references, identical source",
    equal: false,
    build() {
      return { a: () => 1, b: () => 1 };
    },
  },
  {
    name: "functions nested in objects compare by identity",
    equal: false,
    build() {
      return { a: { fn: () => 1 }, b: { fn: () => 1 } };
    },
  },
]);
