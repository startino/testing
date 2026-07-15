<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import TableIcon from '@lucide/svelte/icons/table';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { parse } from '$lib/csv.js';
	import { CSV_PRESETS, type CsvPreset } from '$lib/csv-presets.js';

	// Pure local UI state -- no backend. The table is computed through the SAME
	// shipped CSV codec the monorepo ships, so what renders is the library's real,
	// fail-closed output on every keystroke.

	let csvText = $state('name,role,city\nAda,pioneer,London\nGrace,admiral,New York');
	let delimiter = $state(',');
	let header = $state(false);

	// Delimiter choices the selector offers. The value is the ACTUAL character the
	// codec receives (a real tab for TSV), so the parse the user sees is the parse
	// the library performs.
	const DELIMITERS: { label: string; value: string }[] = [
		{ label: 'Comma  ,', value: ',' },
		{ label: 'Tab  \\t', value: '\t' },
		{ label: 'Semicolon  ;', value: ';' },
		{ label: 'Pipe  |', value: '|' },
	];

	// Normalise the parse result into a { columns, body, empty } view the table can
	// render uniformly across both modes. Header mode yields objects (columns come
	// from the first object's keys); default mode yields arrays (rows are padded to
	// a rectangle so a ragged grid still renders cleanly, with no thead).
	const view = $derived.by(() => {
		const rows = parse(csvText, { delimiter, header });
		if (header) {
			const objs = rows as Record<string, string>[];
			if (objs.length === 0)
				return { columns: [] as string[], body: [] as string[][], empty: true };
			const columns = Object.keys(objs[0]);
			const body = objs.map((o) => columns.map((c) => o[c] ?? ''));
			return { columns, body, empty: false };
		}
		const arr = rows as string[][];
		if (arr.length === 0)
			return { columns: [] as string[], body: [] as string[][], empty: true };
		const maxCols = Math.max(...arr.map((r) => r.length));
		const body = arr.map((r) => {
			const c = [...r];
			while (c.length < maxCols) c.push('');
			return c;
		});
		return { columns: [] as string[], body, empty: false };
	});

	const rowCount = $derived(view.body.length);

	function applyPreset(preset: CsvPreset) {
		csvText = preset.input;
		delimiter = preset.delimiter ?? ',';
		header = preset.header ?? false;
	}

	const fieldClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3';
</script>

<svelte:head>
	<title>CSV playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive playground for the monorepo's zero-dependency src/csv library: parse RFC-4180 CSV into a live HTML table, with a delimiter selector and a header-row toggle."
	/>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
	<div class="flex flex-col items-start gap-3">
		<a
			href="/playground"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
		>
			<ArrowLeftIcon class="size-4" />
			Playground
		</a>
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<TableIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">CSV playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A live demo of this monorepo's zero-dependency <code
				class="bg-muted rounded px-1.5 py-0.5 text-sm"
			>
				src/csv
			</code>
			library.
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">parse</code>
			reads
			<a
				href="https://www.rfc-editor.org/rfc/rfc4180"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2"
			>
				RFC-4180
			</a>
			CSV -- quoted fields, escaped quotes, embedded newlines -- into rows, rendered here as a table
			on every keystroke. Pick a delimiter, toggle the header row, and it all runs in your browser
			against the real shipped library.
		</p>
	</div>

	<div class="mt-8 grid gap-4 lg:grid-cols-2">
		<!-- Left: CSV input + controls -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Input</Card.Title>
				<Card.Description>
					<code class="text-xs">parse(text, &lbrace; delimiter, header &rbrace;)</code>
					-- raw CSV to rows.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="space-y-2">
					<Label for="csv-input">CSV text</Label>
					<textarea
						id="csv-input"
						bind:value={csvText}
						rows={10}
						spellcheck="false"
						autocomplete="off"
						placeholder="paste or type CSV here"
						class="{fieldClass} resize-y font-mono"
						data-testid="csv-input"
					></textarea>
				</div>

				<div class="flex flex-wrap items-end gap-4">
					<div class="space-y-2">
						<Label for="csv-delimiter">Delimiter</Label>
						<select
							id="csv-delimiter"
							bind:value={delimiter}
							class="{fieldClass} h-9"
							data-testid="csv-delimiter"
						>
							{#each DELIMITERS as d (d.value)}
								<option value={d.value}>{d.label}</option>
							{/each}
						</select>
					</div>

					<label
						class="flex cursor-pointer items-center gap-2 py-2 text-sm select-none"
						data-testid="csv-header-toggle"
					>
						<input
							type="checkbox"
							bind:checked={header}
							class="border-input size-4 rounded border accent-current"
						/>
						First row is a header
					</label>
				</div>

				<div class="space-y-2">
					<span class="text-muted-foreground text-sm font-medium">Presets</span>
					<div class="flex flex-wrap gap-2">
						{#each CSV_PRESETS as preset (preset.label)}
							<Button
								variant="outline"
								size="sm"
								onclick={() => applyPreset(preset)}
								data-testid="csv-preset-{preset.label}"
							>
								{preset.label}
							</Button>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Right: parsed table -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center justify-between gap-2">
					Parsed table
					<span
						class="text-muted-foreground text-xs font-normal"
						data-testid="csv-row-count"
					>
						{rowCount}
						{rowCount === 1 ? 'row' : 'rows'}
					</span>
				</Card.Title>
				<Card.Description>The live output of the shipped codec.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div
					class="overflow-x-auto rounded-lg border"
					aria-live="polite"
					data-testid="csv-output"
				>
					{#if view.empty}
						<div class="text-muted-foreground p-4 text-sm italic">
							(no rows -- type some CSV on the left)
						</div>
					{:else}
						<table class="w-full text-left text-sm">
							{#if header}
								<thead class="bg-muted/50 border-b">
									<tr>
										{#each view.columns as col (col)}
											<th class="px-3 py-2 font-medium">{col}</th>
										{/each}
									</tr>
								</thead>
							{/if}
							<tbody>
								{#each view.body as row, r (r)}
									<tr class="border-b last:border-b-0">
										{#each row as cell, c (c)}
											<td
												class="px-3 py-2 font-mono break-all whitespace-pre-wrap"
											>
												{cell}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>
