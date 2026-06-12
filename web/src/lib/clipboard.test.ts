import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '$lib/clipboard';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(value: unknown) {
	Object.defineProperty(globalThis, 'navigator', {
		value,
		configurable: true,
		writable: true,
	});
}

afterEach(() => {
	if (originalNavigator) {
		Object.defineProperty(globalThis, 'navigator', originalNavigator);
	} else {
		// @ts-expect-error -- restoring the absence of navigator (SSR-like environment)
		delete globalThis.navigator;
	}
	vi.restoreAllMocks();
});

describe('copyToClipboard', () => {
	it('writes the exact raw text and resolves true on success', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		setNavigator({ clipboard: { writeText } });

		await expect(copyToClipboard('x')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('x');
	});

	it('resolves false when navigator is unavailable (SSR-safety path)', async () => {
		// @ts-expect-error -- simulate the SSR/prerender environment with no navigator
		delete globalThis.navigator;
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('resolves false when writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'));
		setNavigator({ clipboard: { writeText } });
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});
});
