import { describe, it, expect } from 'vitest';
import { calculate } from '$lib/calc';

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

describe('calculate -- precedence and associativity (value)', () => {
	it('multiplication binds tighter than addition', () => {
		expect(val('2+3*4')).toBe(14);
	});
	it('parentheses override precedence', () => {
		expect(val('(2+3)*4')).toBe(20);
	});
	it('mixed +/-/*', () => {
		expect(val('2+3*4-1')).toBe(13);
	});
	it('division is left-associative', () => {
		expect(val('10/2/5')).toBe(1);
	});
	it('subtraction is left-associative', () => {
		expect(val('2-3-4')).toBe(-5);
	});
	it('^ is right-associative', () => {
		expect(val('2^3^2')).toBe(512);
	});
	it('parens force left grouping of ^', () => {
		expect(val('(2^3)^2')).toBe(64);
	});
	it('unary minus binds looser than ^', () => {
		expect(val('-2^2')).toBe(-4);
	});
	it('explicit parens around negative base', () => {
		expect(val('(-2)^2')).toBe(4);
	});
	it('-(2)^2 negates the power', () => {
		expect(val('-(2)^2')).toBe(-4);
	});
	it('-(2^2) negates the power', () => {
		expect(val('-(2^2)')).toBe(-4);
	});
	it('(-3)^2 is 9', () => {
		expect(val('(-3)^2')).toBe(9);
	});
	it('unary minus allowed in exponent', () => {
		expect(val('2^-2')).toBe(0.25);
	});
	it('2^-3 is 0.125', () => {
		expect(val('2^-3')).toBe(0.125);
	});
	it('chained unary minus (even count)', () => {
		expect(val('--2')).toBe(2);
	});
	it('chained unary minus (odd count)', () => {
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
});

describe('calculate -- numbers (value)', () => {
	it('scientific notation lowercase e', () => {
		expect(val('1.5e3')).toBe(1500);
	});
	it('scientific notation uppercase E with sign', () => {
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
	it('integer exponent literal', () => {
		expect(val('1e10')).toBe(10000000000);
	});
});

describe('calculate -- whitespace + nesting (value)', () => {
	it('whitespace inside nested parens', () => {
		expect(val('( ( 1 + 2 ) )')).toBe(3);
	});
	it('surrounding/interior whitespace', () => {
		expect(val('  2  *  3  ')).toBe(6);
	});
	it('classic mixed expression matches shunting-yard reference', () => {
		expect(val('3 + 4 * 2 / ( 1 - 5 ) ^ 2 ^ 3')).toBe(3.0001220703125);
	});
});

describe('calculate -- formatting (formatted)', () => {
	it('float noise: 0.1 + 0.2 -> 0.3', () => {
		expect(fmt('0.1+0.2')).toBe('0.3');
	});
	it('half', () => {
		expect(fmt('7/2')).toBe('3.5');
	});
	it('scientific collapses to plain integer string', () => {
		expect(fmt('1.5e3')).toBe('1500');
	});
	it('integer result', () => {
		expect(fmt('2+3*4')).toBe('14');
	});
	it('repeating third truncated to 12 sig digits', () => {
		expect(fmt('1/3')).toBe('0.333333333333');
	});
	it('negative power formatted', () => {
		expect(fmt('-2^2')).toBe('-4');
	});
	it('zero never renders as -0', () => {
		expect(fmt('0-0')).toBe('0');
		expect(fmt('0-0')).not.toBe('-0');
	});
	it('power of two formatted', () => {
		expect(fmt('2^10')).toBe('1024');
	});
});

describe('calculate -- error taxonomy (exact strings)', () => {
	it('empty input', () => {
		expect(err('')).toBe('Enter an expression');
	});
	it('whitespace-only input', () => {
		expect(err('   ')).toBe('Enter an expression');
	});
	it('trailing + is incomplete', () => {
		expect(err('2+')).toBe('Incomplete expression');
	});
	it('trailing * is incomplete', () => {
		expect(err('2*')).toBe('Incomplete expression');
	});
	it('unclosed paren is mismatched', () => {
		expect(err('(2+3')).toBe('Mismatched parentheses');
	});
	it('stray close paren is unexpected token', () => {
		expect(err('2)+3')).toBe('Unexpected token');
	});
	it('empty parens are incomplete, not mismatched', () => {
		expect(err('()')).toBe('Incomplete expression');
	});
	it('division by zero literal', () => {
		expect(err('1/0')).toBe('Division by zero');
	});
	it('division by zero via subtraction', () => {
		expect(err('5/(2-2)')).toBe('Division by zero');
	});
	it('zero over zero', () => {
		expect(err('0/0')).toBe('Division by zero');
	});
	it('double-star is an unexpected token (no ** operator)', () => {
		expect(err('2**3')).toBe('Unexpected token');
	});
	it('two numbers without an operator', () => {
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
	it('exponent with no digits leaves stray e', () => {
		expect(err('1e')).toBe('Unexpected character "e"');
	});
	it('bare dot is not a number', () => {
		expect(err('.')).toBe('Unexpected character "."');
	});
	it('overflow to Infinity is non-finite', () => {
		expect(err('1e308*10')).toBe('Result is not a finite number');
	});
});
