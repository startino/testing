import { snippets } from '$lib/snippets.js';
import { highlightToHtml } from '$lib/highlight.js';

// Server-only load so Shiki (highlighter + grammars + WASM) NEVER enters the
// client bundle. The route still prerenders to static HTML at build time; the
// browser only receives the already-highlighted strings via `data`.
// (A universal `+page.ts` would pull `$lib/highlight` into the client graph,
// shipping ~230 kB of highlighter JS for a page that highlights at prerender.)
export const prerender = true;

export async function load() {
	const highlighted = await Promise.all(
		snippets.map(async (s) => ({
			...s,
			html: await highlightToHtml(s.code, s.lang),
		}))
	);
	return { snippets: highlighted };
}
