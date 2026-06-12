<script lang="ts">
	import SnippetCard from '$lib/components/snippet-card.svelte';
	import Toaster from '$lib/components/toaster.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Snippets -- Startino Testing Sandbox</title>
	<meta
		name="description"
		content="A small gallery of theme-aware, syntax-highlighted code snippets. Token colors adapt to light and dark via CSS variables, with copy-to-clipboard on every card."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
	<header class="mb-10 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Snippets</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A small gallery of theme-aware, syntax-highlighted code. Highlighting is computed at
			build time with Shiki, and every token color resolves through CSS variables -- so the
			code flips cleanly between light and dark. Hit copy to grab the raw source.
		</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		{#each data.snippets as snippet (snippet.id)}
			<SnippetCard {snippet} />
		{/each}
	</div>
</div>

<Toaster />
