// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from './clipboard.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('copyToClipboard', () => {
	it('writes to the clipboard and returns true', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await expect(copyToClipboard('x')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith('x');
	});

	it('returns false (never throws) when writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('no'));
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('returns false when navigator is absent (SSR)', async () => {
		vi.stubGlobal('navigator', undefined);
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});

	it('returns false when clipboard is absent', async () => {
		vi.stubGlobal('navigator', {});
		await expect(copyToClipboard('x')).resolves.toBe(false);
	});
});
