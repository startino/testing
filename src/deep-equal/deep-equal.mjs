// Zero-dependency structural equality for supported JavaScript data graphs.
// Node.js v24+, native ESM, typed with JSDoc.

const propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
const hasOwn = Object.prototype.hasOwnProperty;
const functionToString = Function.prototype.toString;
const dateValue = Date.prototype.getTime;
const regexpSource = /** @type {(this: RegExp) => string} */ (
  Object.getOwnPropertyDescriptor(RegExp.prototype, "source")?.get
);
/** @type {Array<(this: RegExp) => boolean>} */
const regexpFlags = /** @type {Array<(this: RegExp) => boolean>} */ (
  [
    "hasIndices",
    "global",
    "ignoreCase",
    "multiline",
    "dotAll",
    "unicode",
    "unicodeSets",
    "sticky",
  ]
    .map((name) => Object.getOwnPropertyDescriptor(RegExp.prototype, name)?.get)
    .filter((getter) => getter !== undefined)
);
const mapSize = /** @type {(this: Map<unknown, unknown>) => number} */ (
  Object.getOwnPropertyDescriptor(Map.prototype, "size")?.get
);
const setSize = /** @type {(this: Set<unknown>) => number} */ (
  Object.getOwnPropertyDescriptor(Set.prototype, "size")?.get
);
const mapEntries = Map.prototype.entries;
const setValues = Set.prototype.values;
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayBrand = /** @type {(this: object) => string | undefined} */ (
  Object.getOwnPropertyDescriptor(typedArrayPrototype, Symbol.toStringTag)?.get
);
const nativeFunctionSource =
  /^function\s+[^()]*(?:\([^)]*\))\s*\{\s*\[native code\]\s*\}$/;

/** @param {unknown} a @param {unknown} b */
function sameValueZero(a, b) {
  return a === b || (a !== a && b !== b);
}

/** @typedef {{ left: Map<object, object>, right: Map<object, object>, trail: Array<[object, object]> }} State */

/** @param {State} state @param {number} checkpoint */
function rollback(state, checkpoint) {
  while (state.trail.length > checkpoint) {
    const [left, right] = /** @type {[object, object]} */ (state.trail.pop());
    state.left.delete(left);
    state.right.delete(right);
  }
}

/** @param {object} value */
function genuineDate(value) {
  try {
    dateValue.call(value);
    return true;
  } catch {
    return false;
  }
}

/** @param {object} value */
function genuineRegExp(value) {
  try {
    regexpSource.call(/** @type {RegExp} */ (value));
    return true;
  } catch {
    return false;
  }
}

/** @param {object} value */
function genuineMap(value) {
  try {
    mapSize.call(/** @type {Map<unknown, unknown>} */ (value));
    return true;
  } catch {
    return false;
  }
}

/** @param {object} value */
function genuineSet(value) {
  try {
    setSize.call(/** @type {Set<unknown>} */ (value));
    return true;
  } catch {
    return false;
  }
}

/** @param {object} value */
function isTypedArray(value) {
  return ArrayBuffer.isView(value) && typedArrayBrand.call(value) !== undefined;
}

/**
 * Ordinary objects include object literals, null-prototype records, and class
 * instances. Native exotic prototypes are kept identity-only.
 * @param {object} value
 */
function isOrdinaryObject(value) {
  let prototype = Object.getPrototypeOf(value);
  while (prototype !== null && prototype !== Object.prototype) {
    if (hasOwn.call(prototype, "constructor")) {
      const constructor = prototype.constructor;
      if (
        typeof constructor === "function" &&
        nativeFunctionSource.test(functionToString.call(constructor))
      )
        return false;
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return true;
}

/** @param {object} value */
function kindOf(value) {
  if (Array.isArray(value)) return "array";
  if (genuineDate(value)) return "date";
  if (genuineRegExp(value)) return "regexp";
  if (genuineMap(value)) return "map";
  if (genuineSet(value)) return "set";
  if (isTypedArray(value)) return "typed-array";
  if (isOrdinaryObject(value)) return "object";
  return "unsupported";
}

/** @param {object} value */
function enumerableKeys(value) {
  /** @type {Array<string | symbol>} */
  const keys = Object.keys(value);
  for (const key of Object.getOwnPropertySymbols(value)) {
    if (propertyIsEnumerable.call(value, key)) keys.push(key);
  }
  return keys;
}

/** @param {string | symbol} key @param {number} length */
function isIndexedKey(key, length) {
  if (typeof key !== "string") return false;
  const number = Number(key);
  return (
    Number.isInteger(number) &&
    number >= 0 &&
    number < length &&
    String(number) === key
  );
}

/**
 * Compare enumerable properties, optionally omitting the indexed elements that
 * an array or typed array has already compared.
 * @param {object} a @param {object} b @param {State} state @param {number | null} indexedLength
 */
function propertiesEqual(a, b, state, indexedLength = null) {
  const left = /** @type {{ [key: string | symbol]: unknown }} */ (a);
  const right = /** @type {{ [key: string | symbol]: unknown }} */ (b);
  const aKeys = enumerableKeys(a).filter(
    (key) => indexedLength === null || !isIndexedKey(key, indexedLength),
  );
  const bKeys = enumerableKeys(b).filter(
    (key) => indexedLength === null || !isIndexedKey(key, indexedLength),
  );
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!propertyIsEnumerable.call(b, key)) return false;
    if (!compare(left[key], right[key], state)) return false;
  }
  return true;
}

/** @param {unknown[]} a @param {unknown[]} b @param {State} state */
function arraysEqual(a, b, state) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const aPresent = hasOwn.call(a, index);
    if (aPresent !== hasOwn.call(b, index)) return false;
    if (aPresent && !compare(a[index], b[index], state)) return false;
  }
  return propertiesEqual(a, b, state, a.length);
}

/** @param {RegExp} a @param {RegExp} b @param {State} state */
function regexpsEqual(a, b, state) {
  if (
    regexpSource.call(a) !== regexpSource.call(b) ||
    a.lastIndex !== b.lastIndex
  )
    return false;
  for (const getFlag of regexpFlags) {
    if (getFlag.call(a) !== getFlag.call(b)) return false;
  }
  return propertiesEqual(a, b, state);
}

/** @param {object} a @param {object} b @param {State} state */
function typedArraysEqual(a, b, state) {
  if (typedArrayBrand.call(a) !== typedArrayBrand.call(b)) return false;
  const left = /** @type {{ length: number, [key: number]: unknown }} */ (a);
  const right = /** @type {{ length: number, [key: number]: unknown }} */ (b);
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!sameValueZero(left[index], right[index])) return false;
  }
  return propertiesEqual(a, b, state, left.length);
}

/**
 * Exhaustively match unordered Map entries. Candidate checkpoints make every
 * rejected branch restore the graph correspondence before the next candidate.
 * @param {Array<[unknown, unknown]>} left @param {Array<[unknown, unknown]>} right
 * @param {boolean[]} used @param {number} index @param {State} state
 */
function matchMapEntries(left, right, used, index, state) {
  if (index === left.length) return true;
  const [leftKey, leftValue] = left[index];
  for (let candidate = 0; candidate < right.length; candidate += 1) {
    if (used[candidate]) continue;
    const checkpoint = state.trail.length;
    const [rightKey, rightValue] = right[candidate];
    if (
      compare(leftKey, rightKey, state) &&
      compare(leftValue, rightValue, state)
    ) {
      used[candidate] = true;
      if (matchMapEntries(left, right, used, index + 1, state)) return true;
      used[candidate] = false;
    }
    rollback(state, checkpoint);
  }
  return false;
}

/** @param {Map<unknown, unknown>} a @param {Map<unknown, unknown>} b @param {State} state */
function mapsEqual(a, b, state) {
  if (mapSize.call(a) !== mapSize.call(b)) return false;
  const left = Array.from(mapEntries.call(a));
  const right = Array.from(mapEntries.call(b));
  return matchMapEntries(
    left,
    right,
    new Array(right.length).fill(false),
    0,
    state,
  );
}

/**
 * @param {unknown[]} left @param {unknown[]} right @param {boolean[]} used
 * @param {number} index @param {State} state
 */
function matchSetValues(left, right, used, index, state) {
  if (index === left.length) return true;
  for (let candidate = 0; candidate < right.length; candidate += 1) {
    if (used[candidate]) continue;
    const checkpoint = state.trail.length;
    if (compare(left[index], right[candidate], state)) {
      used[candidate] = true;
      if (matchSetValues(left, right, used, index + 1, state)) return true;
      used[candidate] = false;
    }
    rollback(state, checkpoint);
  }
  return false;
}

/** @param {Set<unknown>} a @param {Set<unknown>} b @param {State} state */
function setsEqual(a, b, state) {
  if (setSize.call(a) !== setSize.call(b)) return false;
  const left = Array.from(setValues.call(a));
  const right = Array.from(setValues.call(b));
  return matchSetValues(
    left,
    right,
    new Array(right.length).fill(false),
    0,
    state,
  );
}

/** @param {object} a @param {object} b @param {State} state */
function compareObjects(a, b, state) {
  const kind = kindOf(a);
  if (kind === "unsupported" || kind !== kindOf(b)) return false;
  if (
    kind === "object" &&
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  )
    return false;

  switch (kind) {
    case "array":
      return arraysEqual(
        /** @type {unknown[]} */ (a),
        /** @type {unknown[]} */ (b),
        state,
      );
    case "date":
      return sameValueZero(dateValue.call(a), dateValue.call(b));
    case "regexp":
      return regexpsEqual(
        /** @type {RegExp} */ (a),
        /** @type {RegExp} */ (b),
        state,
      );
    case "map":
      return mapsEqual(
        /** @type {Map<unknown, unknown>} */ (a),
        /** @type {Map<unknown, unknown>} */ (b),
        state,
      );
    case "set":
      return setsEqual(
        /** @type {Set<unknown>} */ (a),
        /** @type {Set<unknown>} */ (b),
        state,
      );
    case "typed-array":
      return typedArraysEqual(a, b, state);
    default:
      return propertiesEqual(a, b, state);
  }
}

/** @param {unknown} a @param {unknown} b @param {State} state */
function compare(a, b, state) {
  const aObject = a !== null && typeof a === "object";
  const bObject = b !== null && typeof b === "object";
  if (!aObject || !bObject) return sameValueZero(a, b);

  const leftSeen = state.left.has(a);
  const rightSeen = state.right.has(b);
  if (leftSeen || rightSeen) {
    return (
      leftSeen &&
      rightSeen &&
      state.left.get(a) === b &&
      state.right.get(b) === a
    );
  }

  const checkpoint = state.trail.length;
  state.left.set(a, b);
  state.right.set(b, a);
  state.trail.push([a, b]);

  // Do not skip correspondence recording for shared identity. This matters when
  // the compared graphs overlap: a later attempt to pair either node elsewhere
  // must conflict with the mapping established here.
  const equal = a === b || compareObjects(a, b, state);
  if (!equal) rollback(state, checkpoint);
  return equal;
}

/**
 * Compare two supported JavaScript data graphs using SameValueZero primitives,
 * prototype-compatible object shapes, and bidirectional alias correspondence.
 * Unsupported exotic objects are equal only by identity.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  return compare(a, b, { left: new Map(), right: new Map(), trail: [] });
}
