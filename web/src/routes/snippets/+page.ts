import { snippets } from '$lib/snippets';
import { highlightToHtml } from '$lib/highlight';

// Static gallery -- prerender like the rest of the app. Declaring these locally
// makes the prerender intent obvious even though the global layout already sets them.
export const prerender = true;
export const ssr = true;

// Highlight in load() so it runs on the server during prerender. The browser receives
// static, already-highlighted HTML; zero highlighting JS ships to the client.
export async function load() {
	const highlighted = await Promise.all(
		snippets.map(async (s) => ({ ...s, html: await highlightToHtml(s.code, s.lang) }))
	);
	return { snippets: highlighted };
}
