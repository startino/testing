import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts,
// playground.test.ts, and bytes.test.ts): there is no Svelte render harness in
// vitest, so we assert against the compiled component source. svelte-check
// compiles the component; these assertions pin the demo's wiring -- it consumes
// the shipped adapter (never a fork) and exposes the input, table, and both
// controls the demo is specified to have.
describe('/playground/csv demo', () => {
	it('wires the shipped csv adapter and presets, not a local copy', () => {
		expect(source).toContain("from '$lib/csv.js'");
		expect(source).toContain('parse');
		expect(source).toContain("from '$lib/csv-presets.js'");
		expect(source).toContain('CSV_PRESETS');
	});

	it('exposes the CSV text input and the parsed table output', () => {
		expect(source).toContain('data-testid="csv-input"');
		expect(source).toContain('data-testid="csv-output"');
		expect(source).toContain('<table');
	});

	it('exposes the delimiter selector and the header-row toggle', () => {
		expect(source).toContain('data-testid="csv-delimiter"');
		expect(source).toContain('data-testid="csv-header-toggle"');
	});

	it('links back to the playground hub', () => {
		expect(source).toContain('href="/playground"');
	});
});
