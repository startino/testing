import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			// vitest does not read SvelteKit's alias; point $lib at ./src/lib.
			$lib: resolve('./src/lib'),
		},
	},
	test: {
		// The calc core + clipboard + toast-core all run in plain Node -- proving
		// the core has no browser dependency. jsdom is available as an opt-in env
		// via a `// @vitest-environment jsdom` file comment, but the floor needs none.
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
	},
});
