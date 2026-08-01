import { describe, expect, it } from 'vitest';
import source from './+page.svelte?raw';

// Structural fence, matching this repo's vitest convention (see stat-card.test.ts
// and playground.test.ts): there is no Svelte render harness in vitest, so we
// assert against the compiled component source. svelte-check compiles the
// component; these assertions pin the demo's wiring -- it consumes the shipped
// adapter (never a fork) and exposes all three panel fences.
describe('/playground/semver demo', () => {
	it('wires the shipped semver adapter and presets, not a local copy', () => {
		expect(source).toContain("from '$lib/semver.js'");
		expect(source).toContain('parse');
		expect(source).toContain('compare');
		expect(source).toContain('satisfies');
		expect(source).toContain("from '$lib/semver-presets.js'");
	});

	it('exposes the parse panel (version string -> fields)', () => {
		expect(source).toContain('data-testid="semver-parse-input"');
		expect(source).toContain('data-testid="semver-parse-output"');
	});

	it('exposes the compare panel (two versions -> precedence)', () => {
		expect(source).toContain('data-testid="semver-compare-a-input"');
		expect(source).toContain('data-testid="semver-compare-b-input"');
		expect(source).toContain('data-testid="semver-compare-output"');
	});

	it('exposes the satisfies panel (version + range -> boolean)', () => {
		expect(source).toContain('data-testid="semver-satisfies-version-input"');
		expect(source).toContain('data-testid="semver-satisfies-range-input"');
		expect(source).toContain('data-testid="semver-satisfies-output"');
	});

	it('states the supported-range boundary in the copy', () => {
		// The whole point of the satisfies panel is that the range grammar STOPS
		// at caret/tilde/exact. If that sentence ever drops out of the page, a
		// user reads a false as "does not match" when it meant "not supported".
		expect(source).toContain('^1.2.3');
		expect(source).toContain('~1.2.3');
	});

	it('links back to the playground hub', () => {
		expect(source).toContain('href="/playground"');
	});
});
