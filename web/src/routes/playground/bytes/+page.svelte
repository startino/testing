<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { formatBytes, parseBytes } from '$lib/bytes.js';
	import { BYTES_FORMAT_PRESETS, BYTES_PARSE_PRESETS } from '$lib/bytes-presets.js';

	// Pure local UI state -- no backend. Both previews are computed through the
	// SAME shipped bytes library the monorepo ships, so what renders is the
	// library's real, fail-closed output on every keystroke.

	// Format direction: a byte count -> canonical IEC string. The input is kept
	// as raw text (not a number-typed field) precisely so non-integer / junk
	// input reaches `formatBytes` and shows its fail-closed `null` honestly.
	let bytesText = $state('1048576');
	const formatted = $derived.by(() => {
		const trimmed = bytesText.trim();
		if (trimmed === '') return { state: 'empty' as const };
		// Number('') is 0, so the empty guard above matters; Number('abc') is NaN,
		// Number('1.5') is non-integer -- formatBytes fails closed to null on both.
		const out = formatBytes(Number(trimmed));
		return out === null ? { state: 'invalid' as const } : { state: 'ok' as const, out };
	});

	// Parse direction: an IEC string -> byte count, or null for any non-canonical
	// spelling (the strict inverse). `parseBytes` never throws.
	let iecText = $state('1.5 KiB');
	const parsed = $derived(parseBytes(iecText));
</script>

<svelte:head>
	<title>Bytes playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive playground for the monorepo's zero-dependency src/bytes library: format byte counts into IEC sizes and parse them back with a strict, fail-closed inverse."
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
			<HardDriveIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Bytes playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A live demo of this monorepo's zero-dependency <code
				class="bg-muted rounded px-1.5 py-0.5 text-sm"
			>
				src/bytes
			</code>
			library.
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">formatBytes</code>
			renders a byte count as an IEC size (base 1024), and
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">parseBytes</code>
			is its
			<em>strict inverse</em>
			-- it accepts a string only when it is exactly what the formatter would emit, and fails closed
			to nothing otherwise. Both run in your browser against the real shipped library.
		</p>
	</div>

	<!-- Format: byte count -> IEC string -->
	<Card.Root class="mt-8">
		<Card.Header>
			<Card.Title>Format</Card.Title>
			<Card.Description>
				<code class="text-xs">formatBytes(n)</code>
				-- a byte count to a human-readable IEC size.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="bytes-format-input">Byte count</Label>
				<Input
					id="bytes-format-input"
					bind:value={bytesText}
					inputmode="numeric"
					autocomplete="off"
					placeholder="e.g. 1048576"
					data-testid="bytes-format-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Formatted size</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="bytes-format-output"
				>
					{#if formatted.state === 'ok'}
						<span class="text-foreground">{formatted.out}</span>
					{:else if formatted.state === 'empty'}
						<span class="text-muted-foreground italic">(type a byte count above)</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- not a non-negative safe integer)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each BYTES_FORMAT_PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (bytesText = String(preset.bytes))}
							data-testid="bytes-format-preset-{preset.bytes}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Parse: IEC string -> byte count (strict inverse) -->
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>Parse</Card.Title>
			<Card.Description>
				<code class="text-xs">parseBytes(str)</code>
				-- the strict inverse; non-canonical spellings fail closed.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="bytes-parse-input">IEC size string</Label>
				<Input
					id="bytes-parse-input"
					bind:value={iecText}
					autocomplete="off"
					placeholder="e.g. 1.5 KiB"
					data-testid="bytes-parse-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Parsed byte count</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="bytes-parse-output"
				>
					{#if parsed !== null}
						<span class="text-foreground">{parsed.toLocaleString('en-US')} bytes</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- not a canonical IEC string)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each BYTES_PARSE_PRESETS as preset (preset.input)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (iecText = preset.input)}
							data-testid="bytes-parse-preset-{preset.input}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</section>
