import { describe, it, expect } from 'vitest';
import { formatNumber } from './index.js';

describe('formatNumber', () => {
	it('collapses 0.1 + 0.2 to 0.3', () => {
		expect(formatNumber(0.1 + 0.2)).toBe('0.3');
	});
	it('integers print plain', () => {
		expect(formatNumber(14)).toBe('14');
	});
	it('decimals print shortest', () => {
		expect(formatNumber(3.5)).toBe('3.5');
	});
	it('thousands print plain', () => {
		expect(formatNumber(1500)).toBe('1500');
	});
	it('one third rounds to 12 sig digits', () => {
		expect(formatNumber(1 / 3)).toBe('0.333333333333');
	});
	it('-0 prints as 0', () => {
		expect(formatNumber(-0)).toBe('0');
	});
	it('0 prints as 0', () => {
		expect(formatNumber(0)).toBe('0');
	});
	it('1024 prints plain', () => {
		expect(formatNumber(1024)).toBe('1024');
	});
	it('very small magnitudes use exponential form', () => {
		expect(formatNumber(0.0000005)).toBe('5e-7');
	});
	it('very large magnitudes use exponential form', () => {
		expect(formatNumber(1e21)).toBe('1e+21');
	});
});
