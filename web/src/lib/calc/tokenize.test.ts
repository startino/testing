import { describe, it, expect } from 'vitest';
import { tokenize } from '$lib/calc';
import type { Token } from '$lib/calc';

describe('tokenize', () => {
	it('lexes a simple binary expression', () => {
		expect(tokenize('1+2')).toEqual<Token[]>([
			{ type: 'number', value: 1 },
			{ type: 'op', value: '+' },
			{ type: 'number', value: 2 },
		]);
	});
	it('lexes scientific notation as a single number token', () => {
		expect(tokenize('1.5e3')).toEqual<Token[]>([{ type: 'number', value: 1500 }]);
	});
	it('lexes a leading-dot decimal', () => {
		expect(tokenize('.5')).toEqual<Token[]>([{ type: 'number', value: 0.5 }]);
	});
	it('skips whitespace around parens and numbers', () => {
		expect(tokenize('( 2 )')).toEqual<Token[]>([
			{ type: 'lparen' },
			{ type: 'number', value: 2 },
			{ type: 'rparen' },
		]);
	});
	it('keeps unary minus in exponent as a separate op token', () => {
		expect(tokenize('2^-3')).toEqual<Token[]>([
			{ type: 'number', value: 2 },
			{ type: 'op', value: '^' },
			{ type: 'op', value: '-' },
			{ type: 'number', value: 3 },
		]);
	});
	it('throws on an unexpected character', () => {
		expect(() => tokenize('@')).toThrow('Unexpected character "@"');
	});
});
