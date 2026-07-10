<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';
	import { slugify } from '$lib/slugify.js';
	import { SLUG_PRESETS } from '$lib/slugify-presets.js';

	// Pure local UI state -- no backend. `text` is what the user types; `slug`
	// is derived from it through the SAME shipped slug library the rest of the
	// monorepo uses, so the preview is the library's real output, live.
	let text = $state('');
	const slug = $derived(slugify(text));
</script>

<svelte:head>
	<title>Slugify playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive playground for the monorepo's zero-dependency, unicode-aware src/slug library. Type text and watch the URL-safe slug update live."
	/>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<div class="flex flex-col items-start gap-3">
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<WandSparklesIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Slugify playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A live demo of this monorepo's zero-dependency <code
				class="bg-muted rounded px-1.5 py-0.5 text-sm"
			>
				src/slug
			</code>
			library. It NFKD-folds diacritics, collapses runs of non-alphanumeric characters into a single
			hyphen, and fails closed to an empty string -- all with Node built-ins, no transliterator.
			Type below and watch the slug update on every keystroke.
		</p>
	</div>

	<Card.Root class="mt-8">
		<Card.Header>
			<Card.Title>Try it</Card.Title>
			<Card.Description>
				The preview is the library's actual output, computed live.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="slugify-input">Text to slugify</Label>
				<Input
					id="slugify-input"
					bind:value={text}
					placeholder="Type anything -- e.g. Héllo, World!"
					autocomplete="off"
					data-testid="slugify-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Slug preview</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="slug-output"
				>
					{#if slug}
						<span class="text-foreground">{slug}</span>
					{:else}
						<span class="text-muted-foreground italic">
							(empty -- nothing alphanumeric to slugify yet)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each SLUG_PRESETS as preset (preset.input)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (text = preset.input)}
							data-testid="preset-{slugify(preset.label)}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</section>
