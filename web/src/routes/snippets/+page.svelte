<script lang="ts">
	import SnippetCard from '$lib/components/snippet-card.svelte';
	import Toaster from '$lib/components/toaster.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Snippets -- Startino Testing Sandbox</title>
	<meta
		name="description"
		content="Theme-aware syntax-highlighted code snippets with copy-to-clipboard support."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
	<header class="mb-10 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Snippets</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			Theme-aware code snippets highlighted at build time. Copy any snippet to your clipboard
			with one click.
		</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		{#each data.snippets as snippet (snippet.id)}
			<SnippetCard {snippet} />
		{/each}
	</div>
</div>

<Toaster />
