import { defineConfig } from 'vitest/config';

// Minimal, node-environment vitest config for a headless leaf library. This is
// deliberately NOT a copy of web/'s config (which is SvelteKit/Tailwind/happy-dom
// bound and wrong for a runtime-dependency-free Node module) — see ADR 1.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.test.ts'],
  },
});
