// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import Page from './+page.svelte';
import { DEEP_EQUAL_PRESETS } from '$lib/deep-equal-presets.js';

describe('/playground/deep-equal', () => {
	it('renders semantic displays and updates the live result for every preset', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);
		const component = mount(Page, { target });

		try {
			const select = target.querySelector<HTMLSelectElement>(
				'[data-testid="deep-equal-preset"]'
			);
			const result = target.querySelector<HTMLElement>('[data-testid="deep-equal-result"]');
			expect(select).not.toBeNull();
			expect(result?.getAttribute('role')).toBe('status');
			expect(result?.getAttribute('aria-live')).toBe('polite');
			expect(select?.labels?.[0]?.textContent).toContain('Scenario');

			for (const preset of DEEP_EQUAL_PRESETS) {
				select!.value = preset.id;
				select!.dispatchEvent(new Event('change', { bubbles: true }));
				await tick();
				expect(target.textContent).toContain(preset.description);
				expect(target.querySelector('[data-testid="deep-equal-left"]')?.textContent).toBe(
					preset.leftDisplay
				);
				expect(target.querySelector('[data-testid="deep-equal-right"]')?.textContent).toBe(
					preset.rightDisplay
				);
				expect(result?.textContent).toContain(String(preset.expected));
			}
		} finally {
			unmount(component);
			target.remove();
		}
	});

	it('links back to the playground hub', () => {
		const target = document.createElement('div');
		const component = mount(Page, { target });
		try {
			expect(target.querySelector<HTMLAnchorElement>('a[href="/playground"]')).not.toBeNull();
		} finally {
			unmount(component);
		}
	});
});
