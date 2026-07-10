// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the LRU eviction/recency scenarios. Each scenario is
// a fresh cache of capacity `max`, a sequence of ops applied in order, then an
// assertion of which keys survived (`present`), which were evicted (`absent`),
// and the final `size`. The suite in __tests__/lru.test.mjs interprets these;
// no scenario data is duplicated there.
//
// Op grammar (array tuples):
//   ["set", key, value]  ["get", key]  ["has", key]  ["peek", key]  ["delete", key]
// Only `get` and `set` promote recency; `has` / `peek` / `delete` do not.

/**
 * @type {ReadonlyArray<{
 *   name: string, max: number, ops: Array<Array<any>>,
 *   present: string[], absent: string[], size: number
 * }>}
 */
export const SCENARIOS = Object.freeze([
  {
    name: "evicts the least-recently-used key on overflow",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["set", "c", 3]],
    present: ["b", "c"], absent: ["a"], size: 2,
  },
  {
    name: "get promotes recency, saving a key from eviction",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["get", "a"], ["set", "c", 3]],
    present: ["a", "c"], absent: ["b"], size: 2,
  },
  {
    name: "peek does NOT promote recency",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["peek", "a"], ["set", "c", 3]],
    present: ["b", "c"], absent: ["a"], size: 2,
  },
  {
    name: "has does NOT promote recency",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["has", "a"], ["set", "c", 3]],
    present: ["b", "c"], absent: ["a"], size: 2,
  },
  {
    name: "overwriting an existing key refreshes recency without growing size",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["set", "a", 9], ["set", "c", 3]],
    present: ["a", "c"], absent: ["b"], size: 2,
  },
  {
    name: "capacity of 1 keeps only the latest",
    max: 1,
    ops: [["set", "a", 1], ["set", "b", 2]],
    present: ["b"], absent: ["a"], size: 1,
  },
  {
    name: "delete removes a key and frees a slot",
    max: 2,
    ops: [["set", "a", 1], ["set", "b", 2], ["delete", "a"], ["set", "c", 3]],
    present: ["b", "c"], absent: ["a"], size: 2,
  },
]);
