// Pure timer bookkeeping for the toast store. No runes here -- this is plain TS
// so it is node-importable and unit-testable under fake timers (the leak probe).

export interface ToastTimers {
	// Schedule `cb` to fire after `ms`, keyed by `id`. A prior timer for the same
	// id is cleared first so re-scheduling never leaks.
	schedule(id: number, cb: () => void, ms: number): void;
	// Clear the timer for a single id (if any).
	clear(id: number): void;
	// Clear EVERY pending timer. Called on viewport unmount -> no leaked timers.
	clearAll(): void;
	// Count of currently-pending timers (for tests/diagnostics).
	pending(): number;
}

export function createToastTimers(): ToastTimers {
	const handles = new Map<number, ReturnType<typeof setTimeout>>();

	function clear(id: number): void {
		const h = handles.get(id);
		if (h !== undefined) {
			clearTimeout(h);
			handles.delete(id);
		}
	}

	function schedule(id: number, cb: () => void, ms: number): void {
		// Clear any existing timer for this id first (idempotent re-schedule).
		clear(id);
		const h = setTimeout(() => {
			handles.delete(id);
			cb();
		}, ms);
		handles.set(id, h);
	}

	function clearAll(): void {
		for (const h of handles.values()) {
			clearTimeout(h);
		}
		handles.clear();
	}

	function pending(): number {
		return handles.size;
	}

	return { schedule, clear, clearAll, pending };
}
