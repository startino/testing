import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToastTimers } from './toast-core.js';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('createToastTimers -- the leak probe', () => {
	it('fires a scheduled callback once after its delay', () => {
		const timers = createToastTimers();
		const cb = vi.fn();
		timers.schedule(0, cb, 2000);
		expect(cb).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clearAll prevents a scheduled callback from ever firing', () => {
		const timers = createToastTimers();
		const cb = vi.fn();
		timers.schedule(0, cb, 2000);
		timers.clearAll();
		vi.advanceTimersByTime(5000);
		expect(cb).not.toHaveBeenCalled();
	});

	it('pending() reflects the live scheduled count', () => {
		const timers = createToastTimers();
		expect(timers.pending()).toBe(0);
		timers.schedule(0, () => {}, 2000);
		expect(timers.pending()).toBe(1);
		// After firing, the entry is removed.
		vi.advanceTimersByTime(2000);
		expect(timers.pending()).toBe(0);
		// And after clearAll it is empty.
		timers.schedule(1, () => {}, 2000);
		expect(timers.pending()).toBe(1);
		timers.clearAll();
		expect(timers.pending()).toBe(0);
	});

	it('clear(id) removes a single pending timer without firing it', () => {
		const timers = createToastTimers();
		const a = vi.fn();
		const b = vi.fn();
		timers.schedule(0, a, 2000);
		timers.schedule(1, b, 2000);
		timers.clear(0);
		vi.advanceTimersByTime(2000);
		expect(a).not.toHaveBeenCalled();
		expect(b).toHaveBeenCalledTimes(1);
	});
});
