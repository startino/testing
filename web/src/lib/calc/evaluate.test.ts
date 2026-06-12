import { describe, it, expect } from 'vitest';
import { evaluate, parse, tokenize, CalcError } from './index.js';

describe('evaluate', () => {
	it('evaluates precedence end to end', () => {
		expect(evaluate(parse(tokenize('2+3*4')))).toBe(14);
	});
	it('evaluates a right-associative power', () => {
		expect(evaluate(parse(tokenize('2^3^2')))).toBe(512);
	});
	it('throws CalcError on division by zero', () => {
		expect(() => evaluate(parse(tokenize('1/0')))).toThrow(CalcError);
		expect(() => evaluate(parse(tokenize('1/0')))).toThrow('Division by zero');
	});
	it('evaluates a bare num node', () => {
		expect(evaluate({ type: 'num', value: 5 })).toBe(5);
	});
	it('evaluates a unary-minus node', () => {
		expect(evaluate({ type: 'unary', op: '-', operand: { type: 'num', value: 3 } })).toBe(-3);
	});
});
