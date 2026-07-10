// Structural deep-equality — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/duration/, src/unicode/, src/slug/, and
// src/flags/. Rationale: structural comparison is pure ECMAScript over the
// built-in reflection surface (Object.prototype.toString, ArrayBuffer.isView,
// Object.getOwnPropertySymbols, Map/Set iteration) — nothing to install, no
// build step, no runtime dependency.
//
// `deepEqual(a, b)` answers a single question: do `a` and `b` have the same
// STRUCTURE and the same VALUES, recursively? It is not `===` (which is
// reference identity for objects) and it is not `Object.is` (which is per-value
// but non-recursive). The contract, precisely:
//
//   - Primitives / identity: SameValueZero. `a === b` OR both NaN -> equal. So
//     NaN equals NaN (unlike ===), and +0 equals -0 (unlike Object.is). Every
//     other primitive follows ===.
//   - Objects must share a type tag (Object.prototype.toString.call) to be
//     comparable at all — this one gate separates Date / RegExp / Array / Map /
//     Set / each typed-array kind / plain object, and rejects cross-type pairs
//     (Array vs plain object, Int8Array vs Uint8Array) before any deeper work.
//   - Then per-tag structural rules (Date by time, RegExp by source+flags,
//     Array/typed-array index-wise, Map/Set by unordered structural matching,
//     plain object by own-enumerable string AND symbol keys). Functions compare
//     by identity only (=== already handled the same-reference case).
//   - Cycle-safe: a `seen` Map (a -> b) is threaded through the recursion so a
//     self-referential structure terminates instead of overflowing the stack.
//
// fail-closed-ish contract: deepEqual never throws for any pair of JS values and
// never guesses — an unrecognised or mismatched shape simply returns false.

/**
 * SameValueZero equality for primitives: like `===` but treats `NaN` as equal to
 * itself. `+0` and `-0` are equal under `===`, so they are equal here too — which
 * is exactly the intent (SameValueZero, not Object.is).
 *
 * @param {unknown} x
 * @param {unknown} y
 * @returns {boolean}
 */
function sameValueZero(x, y) {
  // The `x === y` leg makes +0 === -0 true; the second leg rescues NaN, whose
  // defining property is `NaN !== NaN`.
  return x === y || (x !== x && y !== y);
}

/**
 * The canonical type tag of a value, e.g. "[object Date]", "[object Map]",
 * "[object Uint8Array]", "[object Object]". Robust across realms and immune to
 * a forged `.constructor`/`Symbol.toStringTag` on plain data, so it is the gate
 * that keeps Array/Date/RegExp/Map/Set/typed-array/plain-object from being
 * cross-compared.
 *
 * @param {unknown} x
 * @returns {string}
 */
function tagOf(x) {
  return Object.prototype.toString.call(x);
}

/**
 * Recursive worker. `seen` maps each already-entered `a`-object to the `b`-object
 * it was paired with, so a cycle in `a` (revisiting the same node) is only equal
 * if it lines up with the same revisit in `b`. Each object-pair entry is balanced
 * by its own `delete` before returning, so a failed sibling comparison never
 * leaves a stale mapping that could corrupt a later branch.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @param {Map<object, object>} seen
 * @returns {boolean}
 */
function deepEqualInner(a, b, seen) {
  // 1. Primitive / identity fast path (SameValueZero). Catches same-reference
  //    objects too, so identical cyclic references short-circuit for free.
  if (sameValueZero(a, b)) return true;

  // 2. Past this point at least one side differs by ===. If either side is null
  //    or not an object, there is nothing structural left to compare -> not equal.
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  // 3. Tag gate. Different tags -> not equal. Cleanly separates every built-in
  //    exotic kind and each typed-array type from each other and from plain
  //    objects, so the per-tag branches below can assume matching kinds.
  const tag = tagOf(a);
  if (tag !== tagOf(b)) return false;

  // 4. Cycle guard. If `a` was already entered, it is only equal to `b` if it was
  //    paired with this same `b` last time; otherwise the structures diverge.
  const prior = seen.get(a);
  if (prior !== undefined) return prior === b;
  seen.set(a, /** @type {object} */ (b));

  let result;
  try {
    switch (tag) {
      case "[object Date]":
        // Two Dates are equal iff same instant. SameValueZero over getTime()
        // makes two Invalid Dates (both NaN) equal.
        result = sameValueZero(
          /** @type {Date} */ (a).getTime(),
          /** @type {Date} */ (b).getTime(),
        );
        break;

      case "[object RegExp]":
        // Same pattern AND same flags. `.flags` is normalised/sorted by the
        // engine, so two RegExps with the same flags in different written order
        // still compare equal.
        result =
          /** @type {RegExp} */ (a).source === /** @type {RegExp} */ (b).source &&
          /** @type {RegExp} */ (a).flags === /** @type {RegExp} */ (b).flags;
        break;

      case "[object Array]":
        result = arrayEqual(/** @type {unknown[]} */ (a), /** @type {unknown[]} */ (b), seen);
        break;

      case "[object Map]":
        result = mapEqual(/** @type {Map<unknown, unknown>} */ (a), /** @type {Map<unknown, unknown>} */ (b), seen);
        break;

      case "[object Set]":
        result = setEqual(/** @type {Set<unknown>} */ (a), /** @type {Set<unknown>} */ (b), seen);
        break;

      case "[object Function]":
        // Functions have no structural equality — the only equal functions are
        // the same reference, which the === fast path already accepted.
        result = false;
        break;

      default:
        // Typed arrays (Int8Array … Float64Array, BigInt64Array …) are views over
        // an ArrayBuffer; DataView is a view too but is compared as a plain object
        // (it exposes no indexed elements). The tag gate already proved same
        // typed-array kind, so an index-wise SameValueZero scan is sufficient.
        if (ArrayBuffer.isView(a) && !(a instanceof DataView)) {
          result = typedArrayEqual(
            /** @type {{ length: number, [i: number]: unknown }} */ (a),
            /** @type {{ length: number, [i: number]: unknown }} */ (b),
          );
        } else {
          // Everything else — plain objects and other tagged objects (e.g.
          // arguments, Error, DataView) — is compared by own-enumerable keys.
          result = objectEqual(/** @type {object} */ (a), /** @type {object} */ (b), seen);
        }
        break;
    }
  } finally {
    // Balance this call's own `seen` entry unconditionally, so sibling branches
    // and later comparisons start from a clean cycle map.
    seen.delete(a);
  }

  return result;
}

/**
 * Arrays: same length, then element-wise deep comparison in index order.
 *
 * @param {unknown[]} a
 * @param {unknown[]} b
 * @param {Map<object, object>} seen
 * @returns {boolean}
 */
function arrayEqual(a, b, seen) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualInner(a[i], b[i], seen)) return false;
  }
  return true;
}

/**
 * Typed arrays: same length, then index-wise SameValueZero. SameValueZero (not
 * plain ===) so a NaN slot in a Float array matches a NaN slot in the other.
 *
 * @param {{ length: number, [i: number]: unknown }} a
 * @param {{ length: number, [i: number]: unknown }} b
 * @returns {boolean}
 */
function typedArrayEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameValueZero(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Maps: same size, then STRUCTURAL matching. A Map's keys can be objects, so
 * lookup by `b.get(k)` is wrong (it uses SameValueZero identity on keys, not
 * deep equality). Instead every entry of `a` must find a distinct, not-yet-used
 * entry of `b` whose key AND value both deep-equal it — an O(n^2) greedy match
 * over a `used[]` marker array.
 *
 * @param {Map<unknown, unknown>} a
 * @param {Map<unknown, unknown>} b
 * @param {Map<object, object>} seen
 * @returns {boolean}
 */
function mapEqual(a, b, seen) {
  if (a.size !== b.size) return false;
  const bEntries = [...b.entries()];
  const used = new Array(bEntries.length).fill(false);
  for (const [ak, av] of a.entries()) {
    let matched = false;
    for (let j = 0; j < bEntries.length; j++) {
      if (used[j]) continue;
      const [bk, bv] = bEntries[j];
      if (deepEqualInner(ak, bk, seen) && deepEqualInner(av, bv, seen)) {
        used[j] = true;
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

/**
 * Sets: same size, then structural membership. Same greedy O(n^2) approach as
 * Map, matching each member of `a` to a distinct unused member of `b`.
 *
 * @param {Set<unknown>} a
 * @param {Set<unknown>} b
 * @param {Map<object, object>} seen
 * @returns {boolean}
 */
function setEqual(a, b, seen) {
  if (a.size !== b.size) return false;
  const bValues = [...b.values()];
  const used = new Array(bValues.length).fill(false);
  for (const av of a.values()) {
    let matched = false;
    for (let j = 0; j < bValues.length; j++) {
      if (used[j]) continue;
      if (deepEqualInner(av, bValues[j], seen)) {
        used[j] = true;
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

/**
 * Plain (and other tagged) objects: compare own ENUMERABLE keys — both string
 * keys and enumerable symbol keys. Same key count on both sides, and for every
 * key of `a`, `b` must own it as an enumerable property with a deep-equal value.
 * Non-enumerable and inherited properties are deliberately ignored.
 *
 * @param {object} a
 * @param {object} b
 * @param {Map<object, object>} seen
 * @returns {boolean}
 */
function objectEqual(a, b, seen) {
  const aKeys = ownEnumerableKeys(a);
  const bKeys = ownEnumerableKeys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    // `b` must own `k` as an enumerable property (an inherited or non-enumerable
    // key of the same name does not count) …
    if (!Object.prototype.propertyIsEnumerable.call(b, k)) return false;
    // … and its value must deep-equal a's.
    if (!deepEqualInner(/** @type {any} */ (a)[k], /** @type {any} */ (b)[k], seen)) {
      return false;
    }
  }
  return true;
}

/**
 * Own enumerable keys of an object: string keys (Object.keys) plus enumerable
 * symbol keys (getOwnPropertySymbols filtered by propertyIsEnumerable).
 *
 * @param {object} o
 * @returns {Array<string | symbol>}
 */
function ownEnumerableKeys(o) {
  /** @type {Array<string | symbol>} */
  const keys = Object.keys(o);
  for (const s of Object.getOwnPropertySymbols(o)) {
    if (Object.prototype.propertyIsEnumerable.call(o, s)) keys.push(s);
  }
  return keys;
}

/**
 * Structural deep-equality of two arbitrary JavaScript values. Pure, stateless,
 * cycle-safe, and never throws. See the file header for the full contract.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean} `true` iff `a` and `b` are structurally equal.
 */
export function deepEqual(a, b) {
  return deepEqualInner(a, b, new Map());
}
