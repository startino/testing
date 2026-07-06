import { describe, expect, it } from 'vitest';
import componentSource from './stat-card.svelte?raw';

describe('StatCard', () => {
	it('keeps the stat-card slots and trend direction hook renderable', () => {
		// structural fence: this repo has no Svelte render harness in Vitest, so
		// svelte-check compiles the component and this pins the public DOM hooks.
		expect(componentSource).toContain('data-slot="stat-card"');
		expect(componentSource).toContain('data-slot="stat-card-trend"');
		expect(componentSource).toContain("data-trend={trend.direction ?? 'neutral'}");
		expect(componentSource).toContain('{trend.value}');
		expect(componentSource).toContain('{value}');
	});
});
