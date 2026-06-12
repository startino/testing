<script lang="ts">
	import { calculate } from '$lib/calc/index.js';
	import { copyToClipboard } from '$lib/clipboard.js';
	import { toast } from '$lib/toast.svelte.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CopyIcon from '@lucide/svelte/icons/copy';

	let expression = $state('');
	const result = $derived(calculate(expression));
	let history = $state<{ id: number; expr: string; formatted: string }[]>([]);
	let historyId = 0;

	function commitResult() {
		if (!result.ok) {
			return;
		}

		const newEntry = { id: historyId++, expr: expression, formatted: result.formatted };
		history = [newEntry, ...history].slice(0, 10);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			commitResult();
		}
	}

	async function copyHistoryResult(entry: { formatted: string }) {
		const ok = await copyToClipboard(entry.formatted);
		toast.show(ok ? 'Copied ' + entry.formatted : 'Copy failed');
	}
</script>

<svelte:head>
	<title>Calculator -- Startino Testing Sandbox</title>
	<meta
		name="description"
		content="A client-side arithmetic calculator with expression parsing, live evaluation, and history."
	/>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
	<header class="mb-8 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Calculator</h1>
		<p class="text-muted-foreground">
			Evaluate arithmetic expressions with standard operator precedence and exponentiation.
		</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Expression</Card.Title>
			<Card.Description>
				Supports +, -, *, /, ^, parentheses, and scientific notation.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex gap-2">
				<Input
					bind:value={expression}
					class="font-mono"
					autocomplete="off"
					spellcheck={false}
					placeholder="e.g. (1.5e3 + 2) * -3 ^ 2"
					aria-invalid={!result.ok && expression.trim() !== ''}
					onkeydown={handleKeydown}
				/>
				<Button type="button" variant="secondary" onclick={commitResult}>=</Button>
			</div>

			<div aria-live="polite" class="min-h-8">
				{#if expression.trim() === ''}
					<p class="text-muted-foreground font-mono text-2xl">Enter an expression</p>
				{:else if result.ok}
					<p class="text-foreground font-mono text-2xl">{result.formatted}</p>
				{:else}
					<p class="text-destructive font-mono text-2xl">{result.error}</p>
				{/if}
			</div>

			{#if expression.trim() !== ''}
				{#if result.ok}
					<Badge variant="secondary">= {result.formatted}</Badge>
				{:else}
					<Badge variant="destructive">{result.error}</Badge>
				{/if}
			{/if}

			<div class="space-y-2 pt-4">
				<h2 class="text-sm font-medium">History</h2>
				{#if history.length === 0}
					<p class="text-muted-foreground text-sm">No history yet</p>
				{:else}
					<ul class="space-y-2">
						{#each history as entry (entry.id)}
							<li class="flex items-center justify-between gap-2">
								<span class="font-mono text-sm">
									{entry.expr} = {entry.formatted}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Copy result"
									onclick={() => copyHistoryResult(entry)}
								>
									<CopyIcon class="size-4" />
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
