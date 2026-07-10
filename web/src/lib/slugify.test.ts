import { describe, it, expect } from 'vitest';
import { slugify } from './slugify.js';
// Import the canonical library and its fixtures DIRECTLY so this test proves the
// web adapter is the exact same implementation, not a look-alike copy.
import { slugify as canonicalSlugify } from '../../../src/slug/slug.mjs';
import { CASES } from '../../../src/slug/fixtures.mjs';
import { SLUG_PRESETS } from './slugify-presets.js';

describe('slugify (web adapter)', () => {
	it('lowercases and hyphenates words', () => {
		expect(slugify('Hello World')).toBe('hello-world');
	});

	it('strips non-alphanumeric characters and collapses separators', () => {
		expect(slugify('  Foo_Bar! ')).toBe('foo-bar');
	});

	it('returns empty string for empty input', () => {
		expect(slugify('')).toBe('');
	});

	it('returns empty string for symbol-only input', () => {
		expect(slugify('!@#$%')).toBe('');
	});

	it('collapses multiple separators into one hyphen', () => {
		expect(slugify('a---b   c')).toBe('a-b-c');
	});

	it('handles already-valid slugs unchanged', () => {
		expect(slugify('hello-world')).toBe('hello-world');
	});

	// Unicode-aware behavior the divergent web-local copy did NOT have. Proving
	// it here guards against anyone re-forking a simpler implementation.
	it('NFKD-folds diacritics to their ASCII base', () => {
		expect(slugify('Café René')).toBe('cafe-rene');
		expect(slugify('Jürgen Müller')).toBe('jurgen-muller');
	});
});

describe('slugify web adapter == shipped src/slug library', () => {
	// The whole point of the route: the web app consumes the shipped module, not
	// a divergent copy. Assert byte-for-byte agreement across every canonical
	// fixture case (including custom separator / maxLength options).
	it.each(CASES)('matches canonical on fixture: $name', ({ input, opts, expected }) => {
		expect(slugify(input, opts)).toBe(expected);
		expect(slugify(input, opts)).toBe(canonicalSlugify(input, opts));
	});
});

describe('/playground/slugify presets', () => {
	// These are the exact inputs the preset buttons load. The preview the user
	// sees is `slugify(input)`, so asserting these outputs pins what the page
	// renders for each preset.
	const expectedByInput: Record<string, string> = {
		'Héllo, World!': 'hello-world',
		'  Multiple   Spaces  ': 'multiple-spaces',
		'Ünïcode ✨ tëst': 'unicode-test',
	};

	it('covers exactly the three demo presets', () => {
		expect(SLUG_PRESETS.map((p) => p.input)).toEqual(Object.keys(expectedByInput));
	});

	it.each(SLUG_PRESETS)('preset "$label" previews the correct slug', ({ input }) => {
		expect(slugify(input)).toBe(expectedByInput[input]);
		// and it is the shipped library producing that preview, not a fork
		expect(slugify(input)).toBe(canonicalSlugify(input));
	});
});
