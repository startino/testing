import { describe, it, expect } from 'vitest';
import { tokenize, CalcError } from './index.js';

describe('tokenize', () => {
	it('tokenizes a simple sum', () => {
		expect(tokenize('1+2')).toEqual([
			{ type: 'number', value: 1 },
			{ type: 'op', value: '+' },
			{ type: 'number', value: 2 },
		]);
	});
	it('parses a scientific literal into one number token', () => {
		expect(tokenize('1.5e3')).toEqual([{ type: 'number', value: 1500 }]);
	});
	it('parses a leading-dot decimal', () => {
		expect(tokenize('.5')).toEqual([{ type: 'number', value: 0.5 }]);
	});
	it('skips whitespace around parens', () => {
		expect(tokenize('( 2 )')).toEqual([
			{ type: 'lparen' },
			{ type: 'number', value: 2 },
			{ type: 'rparen' },
		]);
	});
	it('separates a power with a unary-minus exponent', () => {
		expect(tokenize('2^-3')).toEqual([
			{ type: 'number', value: 2 },
			{ type: 'op', value: '^' },
			{ type: 'op', value: '-' },
			{ type: 'number', value: 3 },
		]);
	});
	it('throws on an unexpected character', () => {
		expect(() => tokenize('@')).toThrow('Unexpected character "@"');
		expect(() => tokenize('@')).toThrow(CalcError);
	});
});
