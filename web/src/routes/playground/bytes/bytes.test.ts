import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts
// and playground.test.ts): there is no Svelte render harness in vitest, so we
// assert against the compiled component source. svelte-check compiles the
// component; these assertions pin the demo's wiring -- it consumes the shipped
// adapter (never a fork) and exposes both direction fences.
describe('/playground/bytes demo', () => {
	it('wires the shipped bytes adapter and presets, not a local copy', () => {
		expect(source).toContain("from '$lib/bytes.js'");
		expect(source).toContain('formatBytes');
		expect(source).toContain('parseBytes');
		expect(source).toContain("from '$lib/bytes-presets.js'");
	});

	it('exposes the format direction (byte count -> IEC string)', () => {
		expect(source).toContain('data-testid="bytes-format-input"');
		expect(source).toContain('data-testid="bytes-format-output"');
	});

	it('exposes the parse direction (IEC string -> byte count)', () => {
		expect(source).toContain('data-testid="bytes-parse-input"');
		expect(source).toContain('data-testid="bytes-parse-output"');
	});

	it('links back to the playground hub', () => {
		expect(source).toContain('href="/playground"');
	});
});
