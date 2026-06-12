import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
}

const DEFAULT_TTL = 2500; // ms, auto-dismiss

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let seq = 0;
	// Track timers so we can clear them (prevents leaks if dismissed early / on teardown).
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	function dismiss(id: number) {
		const t = timers.get(id);
		if (t) {
			clearTimeout(t);
			timers.delete(id);
		}
		update((list) => list.filter((x) => x.id !== id));
	}

	function show(message: string, ttl = DEFAULT_TTL) {
		const id = ++seq;
		update((list) => [...list, { id, message }]);
		// Guard for SSR: setTimeout exists in Node, but there is no Toaster mounted
		// server-side; show() is only ever called from client event handlers.
		const handle = setTimeout(() => dismiss(id), ttl);
		timers.set(id, handle);
		return id;
	}

	// Clears all pending timers -- call from the Toaster's unmount cleanup.
	function _clearAllTimers() {
		for (const t of timers.values()) clearTimeout(t);
		timers.clear();
	}

	return { subscribe, show, dismiss, _clearAllTimers };
}

export const toast = createToastStore();
