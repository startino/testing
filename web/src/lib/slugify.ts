/**
 * Convert an arbitrary string into a URL-safe slug.
 * Lowercases the input, extracts runs of alphanumeric characters,
 * and joins them with hyphens. Returns "" for empty / symbol-only input.
 */
export function slugify(s: string): string {
	return s.toLowerCase().match(/[a-z0-9]+/g)?.join('-') ?? '';
}
