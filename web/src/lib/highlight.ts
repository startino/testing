import { createCssVariablesTheme, createHighlighter, type Highlighter } from 'shiki';
import type { Lang } from './snippets';

// Maps the friendly snippet `Lang` to the grammar id Shiki expects.
// Exported separately so it is unit-testable in isolation.
const SHIKI_LANG: Record<Lang, string> = {
	typescript: 'typescript',
	svelte: 'svelte',
	shell: 'shellscript',
};

export function toShikiLang(lang: Lang): string {
	return SHIKI_LANG[lang];
}

// Shiki v4 no longer ships a bundled string theme named 'css-variables'; instead
// we build the equivalent CSS-variables theme so every token color is emitted as
// `var(--shiki-...)`. The rendered <pre> keeps `class="shiki css-variables"` and
// references the same `--shiki-*` custom properties we define in app.css, so token
// colors flip with the `.dark` class. No hardcoded hex ever reaches the output.
const cssVariablesTheme = createCssVariablesTheme({
	name: 'css-variables',
	variablePrefix: '--shiki-',
	variableDefaults: {},
	fontStyle: true,
});

// Singleton highlighter created lazily (module-level cached promise) so multiple
// snippets reuse one Shiki instance. Only the 3 grammars + the css-variables theme
// load -- no full bundled language set, no theme set.
let _hp: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	return (_hp ??= createHighlighter({
		themes: [cssVariablesTheme],
		langs: ['typescript', 'svelte', 'shellscript'],
	}));
}

// Returns a Promise<string> of safe, highlighted HTML (a <pre class="shiki ...">...</pre>).
// Pure with respect to inputs: same (code, lang) -> same HTML. No DOM, no globals, Node-safe.
export async function highlightToHtml(code: string, lang: Lang): Promise<string> {
	const highlighter = await getHighlighter();
	return highlighter.codeToHtml(code, {
		lang: toShikiLang(lang),
		theme: 'css-variables',
	});
}
