// SSR-guarded clipboard helper. Async, returns a boolean success flag, never
// throws. Returns false when `navigator`/`navigator.clipboard` is absent
// (Node/SSR) rather than crashing.
export async function copyToClipboard(text: string): Promise<boolean> {
	if (
		typeof navigator === 'undefined' ||
		!navigator.clipboard ||
		typeof navigator.clipboard.writeText !== 'function'
	) {
		return false;
	}
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
