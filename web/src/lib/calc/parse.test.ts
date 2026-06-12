import { describe, it, expect } from 'vitest';
import { parse, tokenize } from './index.js';

describe('parse', () => {
	it('builds a binary add node', () => {
		expect(parse(tokenize('2+3'))).toEqual({
			type: 'binary',
			op: '+',
			left: { type: 'num', value: 2 },
			right: { type: 'num', value: 3 },
		});
	});
	it('wraps the whole power in unary for -2^2', () => {
		expect(parse(tokenize('-2^2'))).toEqual({
			type: 'unary',
			op: '-',
			operand: {
				type: 'binary',
				op: '^',
				left: { type: 'num', value: 2 },
				right: { type: 'num', value: 2 },
			},
		});
	});
	it('exponent is right-associative in the AST', () => {
		expect(parse(tokenize('2^3^2'))).toEqual({
			type: 'binary',
			op: '^',
			left: { type: 'num', value: 2 },
			right: {
				type: 'binary',
				op: '^',
				left: { type: 'num', value: 3 },
				right: { type: 'num', value: 2 },
			},
		});
	});
	it('a single number is a num node', () => {
		expect(parse(tokenize('2'))).toEqual({ type: 'num', value: 2 });
	});
	it('an empty token list is an empty expression', () => {
		expect(() => parse([])).toThrow('Empty expression');
	});
	it('an unclosed paren is mismatched parentheses', () => {
		expect(() => parse(tokenize('(2+3'))).toThrow('Mismatched parentheses');
	});
});
