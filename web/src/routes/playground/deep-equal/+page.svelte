<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import GitCompareArrowsIcon from '@lucide/svelte/icons/git-compare-arrows';
	import { deepEqual } from '$lib/deep-equal.js';
	import { DEEP_EQUAL_PRESETS } from '$lib/deep-equal-presets.js';

	let selectedId = $state(DEEP_EQUAL_PRESETS[0].id);
	const selected = $derived(
		DEEP_EQUAL_PRESETS.find((preset) => preset.id === selectedId) ?? DEEP_EQUAL_PRESETS[0]
	);
	const result = $derived.by(() => {
		const [left, right] = selected.build();
		return deepEqual(left, right);
	});
</script>

<svelte:head>
	<title>Deep Equal playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Explore structural equality for nested objects, unordered collections, typed arrays, cycles, and alias topology with the canonical zero-dependency deepEqual library."
	/>
</svelte:head>

<section class="mx-auto max-w-4xl px-4 py-16 sm:px-6" data-testid="deep-equal-playground">
	<div class="flex flex-col items-start gap-3">
		<a
			href="/playground"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
		>
			<ArrowLeftIcon class="size-4" />
			Playground
		</a>
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<GitCompareArrowsIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Deep Equal playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			Inspect rich values that JSON cannot preserve, then see the canonical
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">deepEqual</code>
			result. The displays explain each runtime graph; they are not parsed as input.
		</p>
	</div>

	<Card.Root class="mt-8">
		<Card.Header>
			<Card.Title>Structural comparison</Card.Title>
			<Card.Description>{selected.description}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="deep-equal-preset">Scenario</Label>
				<select
					id="deep-equal-preset"
					value={selectedId}
					onchange={(event) => (selectedId = event.currentTarget.value)}
					class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
					data-testid="deep-equal-preset"
				>
					{#each DEEP_EQUAL_PRESETS as preset (preset.id)}
						<option value={preset.id}>{preset.label}</option>
					{/each}
				</select>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<span class="text-muted-foreground text-sm font-medium">Left value</span>
					<pre
						class="bg-muted/50 min-h-28 overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap"
						data-testid="deep-equal-left">{selected.leftDisplay}</pre>
				</div>
				<div class="space-y-2">
					<span class="text-muted-foreground text-sm font-medium">Right value</span>
					<pre
						class="bg-muted/50 min-h-28 overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap"
						data-testid="deep-equal-right">{selected.rightDisplay}</pre>
				</div>
			</div>

			<div
				class="bg-muted/50 flex min-h-14 items-center justify-between rounded-lg border px-4 py-3"
				role="status"
				aria-live="polite"
				aria-atomic="true"
				data-testid="deep-equal-result"
			>
				<span class="text-muted-foreground text-sm">deepEqual(left, right)</span>
				<strong
					class={result
						? 'text-emerald-600 dark:text-emerald-400'
						: 'text-rose-600 dark:text-rose-400'}
				>
					{String(result)}
				</strong>
			</div>
		</Card.Content>
	</Card.Root>
</section>
