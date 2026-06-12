import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from '$lib/clipboard';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('copyToClipboard', () => {
	it('writes to the clipboard and resolves true on success', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await expect(copyToClipboard('x')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith('x');
	});

	it('resolves false (never throws) when writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('no'));
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('resolves false when navigator is absent (SSR)', async () => {
		vi.stubGlobal('navigator', undefined);
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('resolves false when navigator has no clipboard', async () => {
		vi.stubGlobal('navigator', {});
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});
});
