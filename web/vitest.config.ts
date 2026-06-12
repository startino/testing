import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Pure-TS units by default. A test file that needs `navigator` can opt in to
		// jsdom via a top-of-file `// @vitest-environment jsdom` comment, or inject a
		// fake `globalThis.navigator` (see clipboard.test.ts).
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
	},
	resolve: {
		// Resolve `$lib/...` imports without pulling in the SvelteKit plugin, so pure-TS
		// tests stay fast and avoid `$app/*` resolution issues.
		alias: { $lib: new URL('./src/lib/', import.meta.url).pathname },
	},
});
