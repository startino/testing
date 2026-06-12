import { createCssVariablesTheme, createHighlighter, type Highlighter } from 'shiki';
import type { Lang } from './snippets';

const SHIKI_LANG: Record<Lang, string> = {
	typescript: 'typescript',
	svelte: 'svelte',
	shell: 'shellscript',
};

const cssVariablesTheme = createCssVariablesTheme();

export function toShikiLang(lang: Lang): string {
	return SHIKI_LANG[lang];
}

let _hp: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	return (_hp ??= createHighlighter({
		themes: [cssVariablesTheme],
		langs: ['typescript', 'svelte', 'shellscript'],
	}));
}

export async function highlightToHtml(code: string, lang: Lang): Promise<string> {
	const highlighter = await getHighlighter();
	return highlighter.codeToHtml(code, {
		lang: toShikiLang(lang),
		theme: 'css-variables',
	});
}
