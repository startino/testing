import { describe, expect, it } from 'vitest';
import { snippets, type Lang } from '$lib/snippets';

const ALLOWED_LANGS: Lang[] = ['typescript', 'svelte', 'shell'];

describe('snippets data integrity', () => {
	it('has at least 3 snippets (the gallery floor)', () => {
		expect(snippets.length).toBeGreaterThanOrEqual(3);
	});

	it('every snippet has a non-empty id, title, and code', () => {
		for (const s of snippets) {
			expect(s.id.trim().length).toBeGreaterThan(0);
			expect(s.title.trim().length).toBeGreaterThan(0);
			expect(s.code.trim().length).toBeGreaterThan(0);
		}
	});

	it('snippet ids are unique', () => {
		const ids = snippets.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every snippet lang is one of the allowed union members', () => {
		for (const s of snippets) {
			expect(ALLOWED_LANGS).toContain(s.lang);
		}
	});

	it('covers at least one of each language: typescript, svelte, shell', () => {
		const langs = new Set(snippets.map((s) => s.lang));
		expect(langs.has('typescript')).toBe(true);
		expect(langs.has('svelte')).toBe(true);
		expect(langs.has('shell')).toBe(true);
	});
});
