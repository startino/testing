import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '$lib/calc';
import type { Expr } from '$lib/calc';

describe('parse', () => {
	it('builds a binary node for a simple sum', () => {
		expect(parse(tokenize('2+3'))).toEqual<Expr>({
			type: 'binary',
			op: '+',
			left: { type: 'num', value: 2 },
			right: { type: 'num', value: 3 },
		});
	});
	it('wraps the whole power in unary minus for -2^2', () => {
		expect(parse(tokenize('-2^2'))).toEqual<Expr>({
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
	it('parses ^ right-associatively', () => {
		expect(parse(tokenize('2^3^2'))).toEqual<Expr>({
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
	it('parses a bare number', () => {
		expect(parse(tokenize('2'))).toEqual<Expr>({ type: 'num', value: 2 });
	});
	it('throws Empty expression on an empty token list', () => {
		expect(() => parse([])).toThrow('Empty expression');
	});
	it('throws Mismatched parentheses on an unclosed paren', () => {
		expect(() => parse(tokenize('(2+3'))).toThrow('Mismatched parentheses');
	});
});
