import { describe, expect, it } from 'vitest';
import { deepEqual } from './deep-equal.js';
import { deepEqual as canonicalDeepEqual } from '../../../src/deep-equal/deep-equal.mjs';
import { GRAPH_CASES, VALUE_CASES } from '../../../src/deep-equal/fixtures.mjs';
import { DEEP_EQUAL_PRESETS } from './deep-equal-presets.js';

describe('deep-equal web adapter', () => {
	it('re-exports the canonical function', () => {
		expect(deepEqual).toBe(canonicalDeepEqual);
	});

	it.each(VALUE_CASES)('matches canonical fixture: $name', ({ a, b, equal }) => {
		expect(deepEqual(a, b)).toBe(equal);
		expect(deepEqual(b, a)).toBe(equal);
	});

	it.each(GRAPH_CASES)('matches canonical graph fixture: $name', ({ build, equal }) => {
		const { a, b } = build();
		expect(deepEqual(a, b)).toBe(equal);
		expect(deepEqual(b, a)).toBe(equal);
	});
});

describe('deep-equal presets', () => {
	it('has stable unique identifiers', () => {
		expect(new Set(DEEP_EQUAL_PRESETS.map(({ id }) => id)).size).toBe(
			DEEP_EQUAL_PRESETS.length
		);
	});

	it.each(DEEP_EQUAL_PRESETS)('$label produces its documented result', ({ build, expected }) => {
		const [left, right] = build();
		expect(deepEqual(left, right)).toBe(expected);
	});

	it('builds fresh graphs', () => {
		for (const preset of DEEP_EQUAL_PRESETS) {
			const first = preset.build();
			const second = preset.build();
			expect(first).not.toBe(second);
			if (typeof first[0] === 'object' && first[0] !== null)
				expect(first[0]).not.toBe(second[0]);
		}
	});
});
