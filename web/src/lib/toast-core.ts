export function createToastTimers() {
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	return {
		schedule(id: number, cb: () => void, delayMs: number): void {
			const handle = setTimeout(() => {
				timers.delete(id);
				cb();
			}, delayMs);
			timers.set(id, handle);
		},
		clear(id: number): void {
			const handle = timers.get(id);
			if (handle !== undefined) {
				clearTimeout(handle);
				timers.delete(id);
			}
		},
		clearAll(): void {
			for (const handle of timers.values()) {
				clearTimeout(handle);
			}
			timers.clear();
		},
		pending(): number {
			return timers.size;
		},
	};
}
