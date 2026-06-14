import { describe, it, expect } from 'vitest';
import { slugify } from './slugify.js';

describe('slugify', () => {
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
});
