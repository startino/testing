import { describe, it, expect } from 'vitest';
import { isPalindrome } from './isPalindrome.js';

describe('isPalindrome', () => {
	it('returns true for empty string', () => {
		expect(isPalindrome('')).toBe(true);
	});

	it('returns true for single character', () => {
		expect(isPalindrome('a')).toBe(true);
	});

	it('returns true for "racecar"', () => {
		expect(isPalindrome('racecar')).toBe(true);
	});

	it('returns false for "hello"', () => {
		expect(isPalindrome('hello')).toBe(false);
	});
});
