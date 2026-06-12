import { describe, expect, it } from 'vitest';
import { highlightToHtml, toShikiLang } from '$lib/highlight';

describe('toShikiLang mapping', () => {
	it('maps friendly Lang labels to Shiki grammar ids', () => {
		expect(toShikiLang('shell')).toBe('shellscript');
		expect(toShikiLang('typescript')).toBe('typescript');
		expect(toShikiLang('svelte')).toBe('svelte');
	});
});

describe('highlightToHtml (Shiki css-variables theme, server-side)', () => {
	it('returns a <pre> using the css-variables theme', async () => {
		const html = await highlightToHtml('const x: number = 1;', 'typescript');
		expect(html).toContain('<pre');
		expect(html).toContain('class="shiki');
		expect(html).toContain('css-variables');
	});

	it('drives token colors through --shiki-* CSS variables, not literal values', async () => {
		const html = await highlightToHtml('const greeting = "hi";', 'typescript');
		// Proves token colors are CSS-variable-driven (theme-flippable).
		expect(html).toContain('var(--shiki-');
	});

	it('emits NO hardcoded hex color that would fail to flip between themes', async () => {
		// The anti-failure-mode assertion: the css-variables theme must never bake
		// a literal `color:#abc` into a span -- that would break in one theme.
		const html = await highlightToHtml(
			'const n = 42; // a number\nconst s = "str";',
			'typescript'
		);
		expect(html).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);
	});

	it('highlights svelte and shell without throwing', async () => {
		const svelte = await highlightToHtml('<script>\n  let count = 0;\n</script>', 'svelte');
		const shell = await highlightToHtml('npm ci\nnpm run build # build', 'shell');
		expect(svelte).toContain('<pre');
		expect(shell).toContain('<pre');
		expect(shell).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);
	});
});
