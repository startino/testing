import { describe, it, expect } from 'vitest';
import { calculate } from './index.js';

const val = (s: string): number => {
	const r = calculate(s);
	if (!r.ok) throw new Error('expected ok: ' + s + ' got ' + r.error);
	return r.value;
};

const fmt = (s: string): string => {
	const r = calculate(s);
	if (!r.ok) throw new Error('expected ok: ' + s + ' got ' + r.error);
	return r.formatted;
};

const err = (s: string): string => {
	const r = calculate(s);
	if (r.ok) throw new Error('expected error: ' + s + ' got ' + r.value);
	return r.error;
};

describe('calculate -- value / precedence', () => {
	it('multiplication binds tighter than addition', () => {
		expect(val('2+3*4')).toBe(14);
	});
	it('parentheses override precedence', () => {
		expect(val('(2+3)*4')).toBe(20);
	});
	it('mixed precedence', () => {
		expect(val('2+3*4-1')).toBe(13);
	});
	it('division is left-associative', () => {
		expect(val('10/2/5')).toBe(1);
	});
	it('subtraction is left-associative', () => {
		expect(val('2-3-4')).toBe(-5);
	});
	it('exponent is RIGHT-associative', () => {
		expect(val('2^3^2')).toBe(512);
	});
	it('parens force left grouping of exponent', () => {
		expect(val('(2^3)^2')).toBe(64);
	});
	it('unary minus binds looser than exponent', () => {
		expect(val('-2^2')).toBe(-4);
	});
	it('explicit parens around a negative base', () => {
		expect(val('(-2)^2')).toBe(4);
	});
	it('negation of a parenthesized base', () => {
		expect(val('-(2)^2')).toBe(-4);
	});
	it('negation of a parenthesized power', () => {
		expect(val('-(2^2)')).toBe(-4);
	});
	it('negative base with parens, even exponent', () => {
		expect(val('(-3)^2')).toBe(9);
	});
	it('unary minus allowed in exponent', () => {
		expect(val('2^-2')).toBe(0.25);
	});
	it('negative exponent yields fraction', () => {
		expect(val('2^-3')).toBe(0.125);
	});
	it('chained unary minus', () => {
		expect(val('--2')).toBe(2);
	});
	it('triple unary minus', () => {
		expect(val('---2')).toBe(-2);
	});
	it('unary plus is a no-op', () => {
		expect(val('+5')).toBe(5);
	});
	it('mixed unary plus/minus', () => {
		expect(val('+-+2')).toBe(-2);
	});
	it('plain division', () => {
		expect(val('7/2')).toBe(3.5);
	});
	it('scientific notation (lowercase e)', () => {
		expect(val('1.5e3')).toBe(1500);
	});
	it('scientific notation (uppercase E, negative exp)', () => {
		expect(val('2E-2')).toBe(0.02);
	});
	it('leading-dot decimals', () => {
		expect(val('.5+.5')).toBe(1);
	});
	it('trailing-dot decimal accepted', () => {
		expect(val('3.')).toBe(3);
	});
	it('large scientific literal', () => {
		expect(val('6.022e23')).toBe(6.022e23);
	});
	it('1e10', () => {
		expect(val('1e10')).toBe(10000000000);
	});
	it('whitespace + nested parens', () => {
		expect(val('( ( 1 + 2 ) )')).toBe(3);
	});
	it('surrounding and interior whitespace', () => {
		expect(val('  2  *  3  ')).toBe(6);
	});
	it('classic mixed expression (precedence + assoc end to end)', () => {
		expect(val('3 + 4 * 2 / ( 1 - 5 ) ^ 2 ^ 3')).toBe(3.0001220703125);
	});
});

describe('calculate -- formatting', () => {
	it('float-noise headline: 0.1+0.2 -> 0.3', () => {
		expect(fmt('0.1+0.2')).toBe('0.3');
	});
	it('7/2 -> 3.5', () => {
		expect(fmt('7/2')).toBe('3.5');
	});
	it('1.5e3 -> 1500', () => {
		expect(fmt('1.5e3')).toBe('1500');
	});
	it('2+3*4 -> 14', () => {
		expect(fmt('2+3*4')).toBe('14');
	});
	it('1/3 -> 12 sig digits', () => {
		expect(fmt('1/3')).toBe('0.333333333333');
	});
	it('-2^2 -> -4', () => {
		expect(fmt('-2^2')).toBe('-4');
	});
	it('0-0 -> 0 (never -0)', () => {
		expect(fmt('0-0')).toBe('0');
		expect(fmt('0-0')).not.toBe('-0');
	});
	it('2^10 -> 1024', () => {
		expect(fmt('2^10')).toBe('1024');
	});
});

describe('calculate -- error taxonomy', () => {
	it('empty input', () => {
		expect(err('')).toBe('Enter an expression');
	});
	it('whitespace-only input', () => {
		expect(err('   ')).toBe('Enter an expression');
	});
	it('trailing + operator -> incomplete', () => {
		expect(err('2+')).toBe('Incomplete expression');
	});
	it('trailing * operator -> incomplete', () => {
		expect(err('2*')).toBe('Incomplete expression');
	});
	it('unclosed paren -> mismatched', () => {
		expect(err('(2+3')).toBe('Mismatched parentheses');
	});
	it('leading close paren -> unexpected token', () => {
		expect(err('2)+3')).toBe('Unexpected token');
	});
	it('empty parens -> incomplete', () => {
		expect(err('()')).toBe('Incomplete expression');
	});
	it('division by zero', () => {
		expect(err('1/0')).toBe('Division by zero');
	});
	it('division by a zero subexpression', () => {
		expect(err('5/(2-2)')).toBe('Division by zero');
	});
	it('zero over zero', () => {
		expect(err('0/0')).toBe('Division by zero');
	});
	it('double-star is not an operator', () => {
		expect(err('2**3')).toBe('Unexpected token');
	});
	it('two numbers with no operator -> unexpected token', () => {
		expect(err('2 3')).toBe('Unexpected token');
	});
	it('no implicit multiplication', () => {
		expect(err('2(3)')).toBe('Unexpected token');
	});
	it('unexpected letter', () => {
		expect(err('2+a')).toBe('Unexpected character "a"');
	});
	it('unexpected symbol', () => {
		expect(err('@')).toBe('Unexpected character "@"');
	});
	it('exponent with no digits leaves a stray e', () => {
		expect(err('1e')).toBe('Unexpected character "e"');
	});
	it('bare dot is not a number', () => {
		expect(err('.')).toBe('Unexpected character "."');
	});
	it('overflow to Infinity -> not finite', () => {
		expect(err('1e308*10')).toBe('Result is not a finite number');
	});
});
