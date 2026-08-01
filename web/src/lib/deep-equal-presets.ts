export type DeepEqualPreset = {
	id: string;
	label: string;
	description: string;
	leftDisplay: string;
	rightDisplay: string;
	build: () => readonly [unknown, unknown];
	expected: boolean;
};

export const DEEP_EQUAL_PRESETS: readonly DeepEqualPreset[] = [
	{
		id: 'nested-equal',
		label: 'Nested structures',
		description:
			'Object key insertion order differs, but the nested arrays and values have the same shape.',
		leftDisplay: '{ user: { id: 7, roles: ["admin", "editor"] }, active: true }',
		rightDisplay: '{ active: true, user: { roles: ["admin", "editor"], id: 7 } }',
		build: () => [
			{ user: { id: 7, roles: ['admin', 'editor'] }, active: true },
			{ active: true, user: { roles: ['admin', 'editor'], id: 7 } },
		],
		expected: true,
	},
	{
		id: 'nested-unequal',
		label: 'Nested difference',
		description:
			'A deeply nested role differs, so the two otherwise similar values are not equal.',
		leftDisplay: '{ user: { roles: ["admin", "editor"] } }',
		rightDisplay: '{ user: { roles: ["admin", "viewer"] } }',
		build: () => [
			{ user: { roles: ['admin', 'editor'] } },
			{ user: { roles: ['admin', 'viewer'] } },
		],
		expected: false,
	},
	{
		id: 'unordered-collections',
		label: 'Unordered Map and Set',
		description:
			'Map entries and Set members are matched structurally, independent of insertion order.',
		leftDisplay: 'Map { { id: 1 } => Set { "read", "write" }, { id: 2 } => Set { "read" } }',
		rightDisplay: 'Map { { id: 2 } => Set { "read" }, { id: 1 } => Set { "write", "read" } }',
		build: () => [
			new Map([
				[{ id: 1 }, new Set(['read', 'write'])],
				[{ id: 2 }, new Set(['read'])],
			]),
			new Map([
				[{ id: 2 }, new Set(['read'])],
				[{ id: 1 }, new Set(['write', 'read'])],
			]),
		],
		expected: true,
	},
	{
		id: 'intrinsic-values',
		label: 'Date, RegExp, and NaN',
		description:
			'Supported intrinsic values use their real brands and state; NaN follows SameValueZero.',
		leftDisplay: '{ when: Date("2026-01-01"), pattern: /deep/gi @ lastIndex 2, score: NaN }',
		rightDisplay: '{ score: NaN, pattern: /deep/ig @ lastIndex 2, when: Date("2026-01-01") }',
		build: () => {
			const leftPattern = /deep/gi;
			const rightPattern = /deep/gi;
			leftPattern.lastIndex = 2;
			rightPattern.lastIndex = 2;
			return [
				{ when: new Date('2026-01-01T00:00:00Z'), pattern: leftPattern, score: NaN },
				{ score: NaN, pattern: rightPattern, when: new Date('2026-01-01T00:00:00Z') },
			];
		},
		expected: true,
	},
	{
		id: 'typed-arrays',
		label: 'Typed arrays',
		description:
			'Same-brand views compare ordered content, not backing-buffer identity or offset.',
		leftDisplay: 'Uint8Array(bufferA, offset 1, length 3) [1, 2, 3]',
		rightDisplay: 'Uint8Array(bufferB, offset 0, length 3) [1, 2, 3]',
		build: () => [
			new Uint8Array(Uint8Array.from([9, 1, 2, 3, 9]).buffer, 1, 3),
			new Uint8Array([1, 2, 3]),
		],
		expected: true,
	},
	{
		id: 'equal-cycle',
		label: 'Equal cycle',
		description:
			'Both roots point back to themselves, so their cyclic graph topology corresponds.',
		leftDisplay: 'left = { name: "root", self: left }',
		rightDisplay: 'right = { name: "root", self: right }',
		build: () => {
			const left: { name: string; self?: unknown } = { name: 'root' };
			const right: { name: string; self?: unknown } = { name: 'root' };
			left.self = left;
			right.self = right;
			return [left, right];
		},
		expected: true,
	},
	{
		id: 'alias-mismatch',
		label: 'Alias topology mismatch',
		description:
			'The left graph shares one child twice; the right graph duplicates an equal-looking child.',
		leftDisplay: 'shared = { value: 1 }; { first: shared, second: shared }',
		rightDisplay: '{ first: { value: 1 }, second: { value: 1 } }',
		build: () => {
			const shared = { value: 1 };
			return [
				{ first: shared, second: shared },
				{ first: { value: 1 }, second: { value: 1 } },
			];
		},
		expected: false,
	},
];
