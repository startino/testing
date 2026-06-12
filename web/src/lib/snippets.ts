// Pure data + types for the /snippets gallery.
// No Svelte, no browser APIs -- directly unit-testable and import-safe under SSR.

export type Lang = 'typescript' | 'svelte' | 'shell';

export interface Snippet {
	/** Stable, unique, kebab-case slug. */
	id: string;
	/** Human title for the card header. */
	title: string;
	/** Drives the language label + the highlighting grammar. */
	lang: Lang;
	/** RAW source, copied verbatim to the clipboard. */
	code: string;
}

export const snippets: Snippet[] = [
	{
		id: 'debounce-ts',
		title: 'Debounce a function',
		lang: 'typescript',
		code: `export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}`,
	},
	{
		id: 'fetch-json-ts',
		title: 'Typed fetch JSON helper',
		lang: 'typescript',
		code: `export async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(\`Request failed: \${res.status} \${res.statusText}\`);
	}
	return (await res.json()) as T;
}`,
	},
	{
		id: 'counter-svelte',
		title: 'Svelte 5 counter',
		lang: 'svelte',
		code: `<script lang="ts">
	let count = $state(0);
	const doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
	Clicked {count} times (doubled: {doubled})
</button>`,
	},
	{
		id: 'deploy-sh',
		title: 'Build and start (adapter-node)',
		lang: 'shell',
		code: `# Install, build, and run the production server.
npm ci
npm run build
PORT=3000 node build`,
	},
];
