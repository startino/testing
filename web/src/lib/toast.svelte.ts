// Minimal, dependency-free toast store. Runes at module scope require the
// `.svelte.ts` extension. Timer bookkeeping is delegated to the plain-TS
// `toast-core.ts` so the leak-probe logic stays node-unit-testable.
import { createToastTimers } from './toast-core.js';

export interface Toast {
	id: number;
	message: string;
}

export const TOAST_TTL_MS = 2000;

// Reactive list rendered by the viewport.
let toasts = $state<Toast[]>([]);
let nextId = 0;

const timers = createToastTimers();

// Returns the reactive array so the viewport reads it inside markup and stays
// reactive (returning the $state proxy preserves reactivity).
export function getToasts(): Toast[] {
	return toasts;
}

export function showToast(message: string): void {
	const id = nextId++;
	toasts.push({ id, message });
	// Auto-dismiss after the TTL. The timer handle is tracked by `timers` so the
	// viewport can clear every pending timer on unmount.
	timers.schedule(id, () => dismissToast(id), TOAST_TTL_MS);
}

export function dismissToast(id: number): void {
	timers.clear(id);
	toasts = toasts.filter((t) => t.id !== id);
}

// Called by the viewport's $effect cleanup on unmount -> no leaked timers.
export function clearAllToastTimers(): void {
	timers.clearAll();
}

// Convenience object so call sites can read `toast.show('...')` per the spec.
export const toast = {
	show: showToast,
	dismiss: dismissToast,
};
