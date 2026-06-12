import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '$lib/clipboard';

// Restore the global after each case so the SSR-undefined path is clean.
afterEach(() => {
	// @ts-expect-error -- test teardown deliberately removes the stubbed global.
	delete globalThis.navigator;
	vi.restoreAllMocks();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
	Object.defineProperty(globalThis, 'navigator', {
		value: { clipboard: { writeText } },
		configurable: true,
		writable: true,
	});
}

describe('copyToClipboard', () => {
	it('writes the exact raw string and resolves true on success', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);

		await expect(copyToClipboard('x')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('x');
	});

	it('resolves false when navigator is unavailable (SSR/prerender path)', async () => {
		// No navigator stubbed -> the guard must short-circuit, never throw.
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('resolves false when writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'));
		stubClipboard(writeText);

		await expect(copyToClipboard('x')).resolves.toBe(false);
	});
});
