import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';
import headerSource from '$lib/components/site-header.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts):
// there is no Svelte render harness in vitest, so we assert against the compiled
// component source. svelte-check compiles the component; these assertions pin the
// hub's public contract -- one card per showcased library, a live link into each
// demo route, and a callout linking the full generated toolbox catalog. The
// coming-soon template branch is retained for future libraries but no card uses
// it now that all three demos are live.
describe('Playground hub', () => {
	it('renders the hub section', () => {
		expect(source).toContain('data-testid="playground-hub"');
	});

	it('registers a card for every showcased utility library', () => {
		for (const name of ['Slugify', 'Bytes', 'Duration']) {
			expect(source).toContain(`name: '${name}'`);
		}
		for (const mod of ['src/slug', 'src/bytes', 'src/duration']) {
			expect(source).toContain(`module: '${mod}'`);
		}
		// each demo renders exactly one card, keyed by id
		expect(source).toContain('{#each demos as demo (demo.id)}');
		expect(source).toContain('data-testid="demo-card-{demo.id}"');
	});

	it('links every live demo into its own route', () => {
		for (const href of ['/playground/slugify', '/playground/bytes', '/playground/duration']) {
			expect(source).toContain(`href: '${href}'`);
		}
		expect(source).toContain('data-testid="demo-link-{demo.id}"');
		expect(source).toContain('Open demo');
	});

	it('has all demos live -- no card is in the coming-soon state', () => {
		// every demo now has a route, so no entry sets `href: null`...
		expect(source).not.toContain('href: null');
		// ...but the coming-soon template branch stays, ready for future libraries.
		expect(source).toContain('{#if demo.href === null}');
		expect(source).toContain('Coming soon');
	});

	it('surfaces the full generated toolbox catalog', () => {
		expect(source).toContain('data-testid="toolbox-catalog"');
		expect(source).toContain('data-testid="toolbox-catalog-link"');
		expect(source).toContain('src/README.md');
	});

	it('is reachable from the site header nav', () => {
		expect(headerSource).toContain("href: '/playground'");
		expect(headerSource).toContain("label: 'Playground'");
	});
});
