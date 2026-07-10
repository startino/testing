import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts
// and playground.test.ts): there is no Svelte render harness in vitest, so we
// assert against the compiled component source. svelte-check compiles the
// component; these assertions pin the demo's wiring -- it consumes the shipped
// adapter (never a fork) and exposes both direction fences.
describe('/playground/duration demo', () => {
	it('wires the shipped duration adapter and presets, not a local copy', () => {
		expect(source).toContain("from '$lib/duration.js'");
		expect(source).toContain('formatDuration');
		expect(source).toContain('parseDuration');
		expect(source).toContain("from '$lib/duration-presets.js'");
	});

	it('exposes the format direction (milliseconds -> compact string)', () => {
		expect(source).toContain('data-testid="duration-format-input"');
		expect(source).toContain('data-testid="duration-format-output"');
	});

	it('exposes the parse direction (duration string -> milliseconds)', () => {
		expect(source).toContain('data-testid="duration-parse-input"');
		expect(source).toContain('data-testid="duration-parse-output"');
	});

	it('links back to the playground hub', () => {
		expect(source).toContain('href="/playground"');
	});
});
