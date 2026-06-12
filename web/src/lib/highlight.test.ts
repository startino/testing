import { describe, expect, it } from 'vitest';
import { highlightToHtml, toShikiLang } from '$lib/highlight';

describe('toShikiLang', () => {
	it("maps 'shell' -> 'shellscript'", () => {
		expect(toShikiLang('shell')).toBe('shellscript');
	});

	it('maps typescript and svelte to themselves', () => {
		expect(toShikiLang('typescript')).toBe('typescript');
		expect(toShikiLang('svelte')).toBe('svelte');
	});
});

describe('highlightToHtml', () => {
	it('returns a Shiki css-variables <pre> block', async () => {
		const html = await highlightToHtml('const x: number = 1; // hi', 'typescript');
		expect(html).toContain('<pre');
		expect(html).toContain('class="shiki');
		expect(html).toContain('css-variables');
	});

	it('drives token colors through CSS variables, not hardcoded hex', async () => {
		const html = await highlightToHtml(
			'const greeting: string = "hello"; // a comment',
			'typescript'
		);
		// Token colors must resolve via --shiki-* vars so they flip with the theme.
		expect(html).toContain('var(--shiki-');
		// And NO literal hex color may appear in any color: style (the anti-hardcoded
		// requirement -- a hex here would not flip between light and dark).
		expect(html).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);
	});

	it('highlights svelte and shell without baking in hex colors', async () => {
		const svelteHtml = await highlightToHtml('<script>let n = $state(0);</script>', 'svelte');
		expect(svelteHtml).toContain('var(--shiki-');
		expect(svelteHtml).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);

		const shellHtml = await highlightToHtml('npm ci # install', 'shell');
		expect(shellHtml).toContain('var(--shiki-');
		expect(shellHtml).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);
	});
});
