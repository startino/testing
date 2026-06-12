import { createToastTimers } from './toast-core.js';

export interface Toast {
	id: number;
	message: string;
}

export const TOAST_TTL_MS = 2000;

let toasts = $state<Toast[]>([]);
let nextId = 0;
const timers = createToastTimers();

export function getToasts(): Toast[] {
	return toasts;
}

export function showToast(message: string): void {
	const id = nextId++;
	toasts.push({ id, message });
	timers.schedule(id, () => dismissToast(id), TOAST_TTL_MS);
}

export function dismissToast(id: number): void {
	timers.clear(id);
	toasts = toasts.filter((t) => t.id !== id);
}

export function clearAllToastTimers(): void {
	timers.clearAll();
}

export const toast = {
	show: showToast,
	dismiss: dismissToast,
};
