import { describe, it, expect } from 'vitest';
import { formatNumber } from '$lib/calc';

describe('formatNumber', () => {
	it('collapses binary float noise (0.1 + 0.2)', () => {
		expect(formatNumber(0.1 + 0.2)).toBe('0.3');
	});
	it('formats an integer with no decimal point', () => {
		expect(formatNumber(14)).toBe('14');
	});
	it('formats a simple decimal', () => {
		expect(formatNumber(3.5)).toBe('3.5');
	});
	it('formats a round thousand', () => {
		expect(formatNumber(1500)).toBe('1500');
	});
	it('truncates a repeating fraction to 12 significant digits', () => {
		expect(formatNumber(1 / 3)).toBe('0.333333333333');
	});
	it('never emits negative zero', () => {
		expect(formatNumber(-0)).toBe('0');
	});
	it('formats positive zero', () => {
		expect(formatNumber(0)).toBe('0');
	});
	it('formats a power of two', () => {
		expect(formatNumber(1024)).toBe('1024');
	});
	it('uses exponential form below 1e-6', () => {
		expect(formatNumber(0.0000005)).toBe('5e-7');
	});
	it('uses exponential form at or above 1e21', () => {
		expect(formatNumber(1e21)).toBe('1e+21');
	});
});
