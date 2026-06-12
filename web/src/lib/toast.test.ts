import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { toast } from '$lib/toast';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	// Ensure no timer survives a test (the leak-defense the card probes for).
	toast._clearAllTimers();
	// Drain any toasts left in the store between cases.
	for (const t of get(toast)) toast.dismiss(t.id);
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
});

describe('toast store', () => {
	it('show() adds a toast with the given message', () => {
		toast.show('Copied to clipboard');
		const list = get(toast);
		expect(list).toHaveLength(1);
		expect(list[0].message).toBe('Copied to clipboard');
	});

	it('auto-dismisses after the TTL elapses', () => {
		toast.show('temporary', 1000);
		expect(get(toast)).toHaveLength(1);

		vi.advanceTimersByTime(999);
		expect(get(toast)).toHaveLength(1);

		vi.advanceTimersByTime(1);
		expect(get(toast)).toHaveLength(0);
	});

	it('dismiss() removes a toast immediately and clears its timer', () => {
		const id = toast.show('manual', 5000);
		expect(get(toast)).toHaveLength(1);

		toast.dismiss(id);
		expect(get(toast)).toHaveLength(0);

		// Advancing past the original TTL must NOT throw or re-remove anything.
		vi.advanceTimersByTime(5000);
		expect(get(toast)).toHaveLength(0);
	});

	it('_clearAllTimers() prevents any pending auto-dismiss from firing', () => {
		toast.show('a', 1000);
		toast.show('b', 1000);
		expect(get(toast)).toHaveLength(2);

		toast._clearAllTimers();
		// Timers are gone, so the toasts persist (no timer fires after teardown).
		vi.advanceTimersByTime(5000);
		expect(get(toast)).toHaveLength(2);
	});
});
