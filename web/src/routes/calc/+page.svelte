<script lang="ts">
	import { calculate } from '$lib/calc/index.js';
	import { copyToClipboard } from '$lib/clipboard.js';
	import { toast } from '$lib/toast.svelte.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EqualIcon from '@lucide/svelte/icons/equal';

	interface HistoryEntry {
		id: number;
		expr: string;
		formatted: string;
	}

	const HISTORY_CAP = 10;

	let expression = $state('');
	const result = $derived(calculate(expression));
	let history = $state<HistoryEntry[]>([]);
	let historyId = 0;

	const isEmpty = $derived(expression.trim() === '');
	const isError = $derived(!result.ok && !isEmpty);

	function commit() {
		if (!result.ok) {
			return;
		}
		const entry: HistoryEntry = {
			id: historyId++,
			expr: expression,
			formatted: result.formatted,
		};
		history = [entry, ...history].slice(0, HISTORY_CAP);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		}
	}

	async function copyResult(formatted: string) {
		const ok = await copyToClipboard(formatted);
		toast.show(ok ? `Copied ${formatted}` : 'Copy failed');
	}
</script>

<svelte:head>
	<title>Calculator -- Startino Testing Sandbox</title>
	<meta
		name="description"
		content="A client-side arithmetic expression evaluator with a hand-rolled parser: precedence, right-associative exponents, unary minus, and a tidy float formatter."
	/>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
	<header class="mb-8 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Calculator</h1>
		<p class="text-muted-foreground text-pretty">
			Type an arithmetic expression and see the result live. Supports <span
				class="text-foreground font-medium"
			>
				+ - * / ^
			</span>
			, parentheses, unary minus, decimals, and scientific notation -- all evaluated by a hand-rolled
			parser.
		</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Expression</Card.Title>
			<Card.Description>
				Operator precedence with right-associative exponents.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center gap-2">
				<Input
					bind:value={expression}
					onkeydown={onKeydown}
					placeholder="e.g. (1.5e3 + 2) * -3 ^ 2"
					class="font-mono"
					autocomplete="off"
					spellcheck={false}
					aria-invalid={isError}
					aria-label="Arithmetic expression"
				/>
				<Button
					onclick={commit}
					disabled={!result.ok}
					aria-label="Compute and save to history"
				>
					<EqualIcon class="size-4" />
					<span class="sr-only sm:not-sr-only">Compute</span>
				</Button>
			</div>

			<div class="min-h-7" aria-live="polite">
				{#if isEmpty}
					<p class="text-muted-foreground text-sm">Type an expression above</p>
				{:else if result.ok}
					<div class="flex items-baseline gap-2">
						<span class="text-muted-foreground text-sm">=</span>
						<span class="text-foreground font-mono text-2xl font-semibold">
							{result.formatted}
						</span>
					</div>
				{:else}
					<p class="text-destructive font-mono text-sm">{result.error}</p>
				{/if}
			</div>

			{#if !isEmpty}
				<div>
					{#if result.ok}
						<Badge variant="secondary" class="font-mono">= {result.formatted}</Badge>
					{:else}
						<Badge variant="destructive" class="font-mono">{result.error}</Badge>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>History</Card.Title>
			<Card.Description>
				The last {HISTORY_CAP} computed expressions, newest first.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if history.length === 0}
				<p class="text-muted-foreground text-sm">No history yet</p>
			{:else}
				<ul class="divide-border divide-y">
					{#each history as entry (entry.id)}
						<li class="flex items-center justify-between gap-2 py-2">
							<span class="text-foreground truncate font-mono text-sm">
								{entry.expr}
								<span class="text-muted-foreground">=</span>
								{entry.formatted}
							</span>
							<Button
								variant="ghost"
								size="xs"
								onclick={() => copyResult(entry.formatted)}
								aria-label="Copy result {entry.formatted}"
								title="Copy result"
							>
								<CopyIcon class="size-3" />
								Copy
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
