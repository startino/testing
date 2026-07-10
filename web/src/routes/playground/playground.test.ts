import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';
import headerSource from '$lib/components/site-header.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts):
// there is no Svelte render harness in vitest, so we assert against the compiled
// component source. svelte-check compiles the component; these assertions pin the
// hub's public contract -- one card per showcased library, a live link for demos
// that have a route, and a coming-soon state for those that do not.
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

	it('links the live Slugify demo into its route', () => {
		expect(source).toContain("href: '/playground/slugify'");
		expect(source).toContain('data-testid="demo-link-{demo.id}"');
		expect(source).toContain('Open demo');
	});

	it('shows a coming-soon state for libraries without a demo route yet', () => {
		// bytes and duration have no route -> href is null -> coming-soon card
		expect(source).toContain('href: null');
		expect(source).toContain('data-testid="demo-soon-{demo.id}"');
		expect(source).toContain('Coming soon');
	});

	it('is reachable from the site header nav', () => {
		expect(headerSource).toContain("href: '/playground'");
		expect(headerSource).toContain("label: 'Playground'");
	});
});
