import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Dedicated vitest config (NOT vite.config.ts) so the SvelteKit plugin and
// $app/* resolution never enter the test graph -- keeps the pure-TS units fast.
export default defineConfig({
	test: {
		// Pure TS units run in node; a specific test file can opt into jsdom via a
		// top-of-file `// @vitest-environment jsdom` comment if it needs `navigator`.
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
	},
	resolve: {
		// Resolve `$lib/...` imports without SvelteKit so tests match app code.
		alias: {
			$lib: fileURLToPath(new URL('./src/lib/', import.meta.url)),
		},
	},
});
