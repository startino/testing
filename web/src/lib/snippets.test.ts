import { describe, expect, it } from 'vitest';
import { snippets, type Lang } from '$lib/snippets';

const LANGS: Lang[] = ['typescript', 'svelte', 'shell'];

describe('snippets data', () => {
	it('every snippet has non-empty id, title, and code', () => {
		for (const s of snippets) {
			expect(s.id.trim().length).toBeGreaterThan(0);
			expect(s.title.trim().length).toBeGreaterThan(0);
			expect(s.code.trim().length).toBeGreaterThan(0);
		}
	});

	it('ids are unique', () => {
		const ids = snippets.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every lang is one of the allowed union members', () => {
		for (const s of snippets) {
			expect(LANGS).toContain(s.lang);
		}
	});

	it('has at least one snippet of each language', () => {
		for (const lang of LANGS) {
			expect(snippets.some((s) => s.lang === lang)).toBe(true);
		}
	});
});
