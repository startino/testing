import { writable } from 'svelte/store';

export type Toast = { id: number; message: string };

const DEFAULT_TTL = 2500;

export function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let seq = 0;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	function dismiss(id: number) {
		const handle = timers.get(id);
		if (handle !== undefined) {
			clearTimeout(handle);
			timers.delete(id);
		}
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function show(message: string, ttl = DEFAULT_TTL): number {
		const id = ++seq;
		update((toasts) => [...toasts, { id, message }]);
		const handle = setTimeout(() => dismiss(id), ttl);
		timers.set(id, handle);
		return id;
	}

	function _clearAllTimers() {
		for (const handle of timers.values()) {
			clearTimeout(handle);
		}
		timers.clear();
	}

	return { subscribe, show, dismiss, _clearAllTimers };
}

export const toast = createToastStore();
