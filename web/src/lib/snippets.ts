export type Lang = 'typescript' | 'svelte' | 'shell';

export interface Snippet {
	id: string;
	title: string;
	lang: Lang;
	code: string;
}

export const snippets: Snippet[] = [
	{
		id: 'debounce-ts',
		title: 'Debounce a function',
		lang: 'typescript',
		code: `export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}`,
	},
	{
		id: 'counter-svelte',
		title: 'Svelte 5 counter',
		lang: 'svelte',
		code: `<script lang="ts">
	let count = $state(0);
</script>

<button onclick={() => count++}>
	Clicked {count} times
</button>`,
	},
	{
		id: 'deploy-sh',
		title: 'Build and start (adapter-node)',
		lang: 'shell',
		code: `#!/usr/bin/env bash
# Install deps and run production build
npm ci
npm run build
PORT=3000 node build`,
	},
];
