import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToastTimers } from '$lib/toast-core';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('createToastTimers (leak probe)', () => {
	it('fires a scheduled callback once after its delay', () => {
		const timers = createToastTimers();
		const cb = vi.fn();
		timers.schedule(1, cb, 2000);
		expect(cb).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clearAll prevents a pending callback from ever firing', () => {
		const timers = createToastTimers();
		const cb = vi.fn();
		timers.schedule(1, cb, 2000);
		timers.clearAll();
		vi.advanceTimersByTime(5000);
		expect(cb).not.toHaveBeenCalled();
	});

	it('pending() reflects the live scheduled count', () => {
		const timers = createToastTimers();
		const cb = vi.fn();
		expect(timers.pending()).toBe(0);
		timers.schedule(1, cb, 2000);
		expect(timers.pending()).toBe(1);
		vi.advanceTimersByTime(2000);
		expect(timers.pending()).toBe(0);
	});

	it('pending() returns to 0 after clearAll', () => {
		const timers = createToastTimers();
		timers.schedule(1, vi.fn(), 2000);
		timers.schedule(2, vi.fn(), 2000);
		expect(timers.pending()).toBe(2);
		timers.clearAll();
		expect(timers.pending()).toBe(0);
	});
});
