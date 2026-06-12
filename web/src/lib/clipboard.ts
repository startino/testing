// Copies raw text to the clipboard. Returns true on success, false otherwise.
// SSR/prerender-safe: no-ops (returns false) when navigator.clipboard is unavailable.
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
