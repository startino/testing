import { snippets } from '$lib/snippets';
import { highlightToHtml } from '$lib/highlight';

// Static gallery -- prerender like the rest of the app. Declaring these locally
// makes the prerender intent obvious even though the global layout already sets them.
export const prerender = true;
export const ssr = true;

// Highlight in a SERVER load() so it runs only on the server (at prerender time). A
// server load keeps the Shiki highlighter out of the client import graph entirely -- the
// browser receives static, already-highlighted HTML and zero highlighting JS / WASM.
// (A universal +page.ts load would pull `$lib/highlight` -> `shiki` into the client
// bundle; a +page.server.ts load does not.)
export async function load() {
	const highlighted = await Promise.all(
		snippets.map(async (s) => ({ ...s, html: await highlightToHtml(s.code, s.lang) }))
	);
	return { snippets: highlighted };
}
