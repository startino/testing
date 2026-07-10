<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { formatDuration, parseDuration } from '$lib/duration.js';
	import { DURATION_FORMAT_PRESETS, DURATION_PARSE_PRESETS } from '$lib/duration-presets.js';

	// Pure local UI state -- no backend. Both previews are computed through the
	// SAME shipped duration library the monorepo ships, so what renders is the
	// library's real, fail-closed output on every keystroke.

	// Format direction: a millisecond count -> compact duration string. The input
	// is kept as raw text so non-integer / junk input reaches `formatDuration`
	// and shows its fail-closed `null` honestly.
	let msText = $state('90000');
	const formatted = $derived.by(() => {
		const trimmed = msText.trim();
		if (trimmed === '') return { state: 'empty' as const };
		// Number('1.5') is non-integer and Number('abc') is NaN -- formatDuration
		// fails closed to null on both.
		const out = formatDuration(Number(trimmed));
		return out === null ? { state: 'invalid' as const } : { state: 'ok' as const, out };
	});

	// Parse direction: a duration string -> milliseconds, or null for anything
	// outside the strict grammar. `parseDuration` never throws.
	let durText = $state('1m 30s');
	const parsed = $derived(parseDuration(durText));
</script>

<svelte:head>
	<title>Duration playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive playground for the monorepo's zero-dependency src/duration library: format millisecond counts into compact durations and parse them back with a strict, fail-closed inverse."
	/>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<div class="flex flex-col items-start gap-3">
		<a
			href="/playground"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
		>
			<ArrowLeftIcon class="size-4" />
			Playground
		</a>
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<TimerIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Duration playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A live demo of this monorepo's zero-dependency <code
				class="bg-muted rounded px-1.5 py-0.5 text-sm"
			>
				src/duration
			</code>
			library.
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">formatDuration</code>
			renders milliseconds as a compact
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">1m 30s</code>
			string, and
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">parseDuration</code>
			is its
			<em>strict inverse</em>
			-- it accepts only strings in that exact grammar and fails closed otherwise. Both run in your
			browser against the real shipped library.
		</p>
	</div>

	<!-- Format: milliseconds -> compact duration string -->
	<Card.Root class="mt-8">
		<Card.Header>
			<Card.Title>Format</Card.Title>
			<Card.Description>
				<code class="text-xs">formatDuration(ms)</code>
				-- a millisecond count to a compact duration.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="duration-format-input">Milliseconds</Label>
				<Input
					id="duration-format-input"
					bind:value={msText}
					inputmode="numeric"
					autocomplete="off"
					placeholder="e.g. 90000"
					data-testid="duration-format-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Formatted duration</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="duration-format-output"
				>
					{#if formatted.state === 'ok'}
						<span class="text-foreground">{formatted.out}</span>
					{:else if formatted.state === 'empty'}
						<span class="text-muted-foreground italic">
							(type a millisecond count above)
						</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- not a non-negative integer)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each DURATION_FORMAT_PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (msText = String(preset.ms))}
							data-testid="duration-format-preset-{preset.ms}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Parse: duration string -> milliseconds (strict inverse) -->
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>Parse</Card.Title>
			<Card.Description>
				<code class="text-xs">parseDuration(str)</code>
				-- the strict inverse; anything outside the grammar fails closed.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="duration-parse-input">Duration string</Label>
				<Input
					id="duration-parse-input"
					bind:value={durText}
					autocomplete="off"
					placeholder="e.g. 1m 30s"
					data-testid="duration-parse-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Parsed milliseconds</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="duration-parse-output"
				>
					{#if parsed !== null}
						<span class="text-foreground">{parsed.toLocaleString('en-US')} ms</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- not a valid duration string)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each DURATION_PARSE_PRESETS as preset (preset.input)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (durText = preset.input)}
							data-testid="duration-parse-preset-{preset.label}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</section>
