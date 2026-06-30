import { describe, expect, it } from 'vitest';
import { mount, unmount } from 'svelte';
import TextInput from './text-input.svelte';

describe('TextInput', () => {
	it('renders the label and placeholder', () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const component = mount(TextInput, {
			target,
			props: {
				label: 'Email',
				value: '',
				placeholder: 'name@example.com',
			},
		});

		try {
			expect(target.textContent).toContain('Email');
			expect(target.querySelector('input')?.placeholder).toBe('name@example.com');
		} finally {
			unmount(component);
			target.remove();
		}
	});
});
