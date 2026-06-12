import { describe, it, expect } from 'vitest';
import { evaluate, parse, tokenize } from '$lib/calc';

describe('evaluate', () => {
	it('respects precedence end to end', () => {
		expect(evaluate(parse(tokenize('2+3*4')))).toBe(14);
	});
	it('respects right-associative power', () => {
		expect(evaluate(parse(tokenize('2^3^2')))).toBe(512);
	});
	it('throws Division by zero', () => {
		expect(() => evaluate(parse(tokenize('1/0')))).toThrow('Division by zero');
	});
	it('evaluates a bare number node', () => {
		expect(evaluate({ type: 'num', value: 5 })).toBe(5);
	});
	it('evaluates a unary-minus node', () => {
		expect(evaluate({ type: 'unary', op: '-', operand: { type: 'num', value: 3 } })).toBe(-3);
	});
});
