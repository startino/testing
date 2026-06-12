import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { toast, type Toast } from '$lib/toast';

function current(): Toast[] {
	return get({ subscribe: toast.subscribe });
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	// Drain any leftover toasts so tests stay isolated, then restore real timers.
	for (const t of current()) toast.dismiss(t.id);
	toast._clearAllTimers();
	vi.useRealTimers();
});

describe('toast store', () => {
	it('show() adds a toast', () => {
		toast.show('hello');
		const list = current();
		expect(list.length).toBe(1);
		expect(list[0].message).toBe('hello');
	});

	it('explicit dismiss() removes the toast and clears its timer', () => {
		const id = toast.show('bye');
		expect(current().length).toBe(1);
		toast.dismiss(id);
		expect(current().length).toBe(0);
		// No timer remains: advancing time must not throw or resurrect anything.
		vi.advanceTimersByTime(10_000);
		expect(current().length).toBe(0);
	});

	it('auto-dismisses after the TTL', () => {
		toast.show('temporary', 2500);
		expect(current().length).toBe(1);
		vi.advanceTimersByTime(2499);
		expect(current().length).toBe(1);
		vi.advanceTimersByTime(1);
		expect(current().length).toBe(0);
	});

	it('_clearAllTimers() prevents pending dismiss timers from firing', () => {
		toast.show('a');
		toast.show('b');
		expect(current().length).toBe(2);
		toast._clearAllTimers();
		// Timers were cleared, so the toasts persist (no auto-dismiss fires) -- proving
		// the cleanup path cancels every pending setTimeout rather than leaking them.
		vi.advanceTimersByTime(10_000);
		expect(current().length).toBe(2);
	});
});
