<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import TableIcon from '@lucide/svelte/icons/table';
	import TagsIcon from '@lucide/svelte/icons/tags';
	import GitCompareArrowsIcon from '@lucide/svelte/icons/git-compare-arrows';
	import LibraryBigIcon from '@lucide/svelte/icons/library-big';
	import type { Component } from 'svelte';

	type Demo = {
		id: string;
		name: string;
		blurb: string;
		module: string;
		href: string | null;
		icon: Component;
	};

	// The hub is a pure, presentational index over the monorepo's utility demos.
	// Each entry names the zero-dependency `src/` library it showcases and links
	// into that library's live demo route. A library whose interactive route has
	// not shipped yet renders as a disabled "coming soon" card -- no dead links --
	// and flips live the moment its `/playground/<id>` route lands. There is no
	// backend here: the routes each card points at compute against the real
	// shipped library in the browser.
	const demos: Demo[] = [
		{
			id: 'slugify',
			name: 'Slugify',
			blurb: 'Turn arbitrary text into a URL-safe slug, live on every keystroke -- NFKD diacritic folding, hyphen collapsing, and a fail-closed empty string.',
			module: 'src/slug',
			href: '/playground/slugify',
			icon: WandSparklesIcon,
		},
		{
			id: 'bytes',
			name: 'Bytes',
			blurb: 'Format raw byte counts into human-readable sizes and parse them back -- a strict, zero-dependency inverse pair over the whole domain.',
			module: 'src/bytes',
			href: '/playground/bytes',
			icon: HardDriveIcon,
		},
		{
			id: 'duration',
			name: 'Duration',
			blurb: 'Render millisecond durations as compact, human-readable strings like "1m 30s", with predictable rounding and unit selection.',
			module: 'src/duration',
			href: '/playground/duration',
			icon: TimerIcon,
		},
		{
			id: 'csv',
			name: 'Csv',
			blurb: 'Parse RFC-4180 CSV -- quoted delimiters, escaped quotes, embedded newlines -- into a live table, with a delimiter selector and a header-row toggle.',
			module: 'src/csv',
			href: '/playground/csv',
			icon: TableIcon,
		},
		{
			id: 'semver',
			name: 'Semver',
			blurb: 'Parse strict SemVer 2.0.0 versions, order them by precedence, and test them against caret, tilde, and exact ranges -- fail-closed on everything else.',
			module: 'src/semver',
			href: '/playground/semver',
			icon: TagsIcon,
		},
		{
			id: 'deep-equal',
			name: 'Deep Equal',
			blurb: 'Compare nested data graphs with cycle-safe, alias-aware structural equality across objects, collections, dates, regular expressions, and typed arrays.',
			module: 'src/deep-equal',
			href: '/playground/deep-equal',
			icon: GitCompareArrowsIcon,
		},
	];

	const liveCount = demos.filter((demo) => demo.href !== null).length;
</script>

<svelte:head>
	<title>Playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive demos for the Startino testing monorepo's zero-dependency src/ utility libraries: slugify, bytes, duration formatting, RFC-4180 CSV parsing, SemVer, and structural deep equality."
	/>
</svelte:head>

<section data-testid="playground-hub" class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
	<div class="flex flex-col items-start gap-3">
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<FlaskConicalIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			Live, interactive demos of this monorepo's zero-dependency
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">src/</code>
			utility libraries. Each card wires a real shipped library to a small UI, so what you see is
			the library's actual output -- no mocks, no backend.
		</p>
		<Badge variant="secondary" class="gap-1.5" data-testid="playground-live-count">
			<span class="bg-primary size-1.5 rounded-full"></span>
			{liveCount} of {demos.length} demos live
		</Badge>
	</div>

	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each demos as demo (demo.id)}
			{@const Icon = demo.icon}
			<Card.Root class="flex h-full flex-col" data-testid="demo-card-{demo.id}">
				<Card.Header>
					<div
						class="bg-muted text-foreground mb-2 flex size-9 items-center justify-center rounded-lg"
					>
						<Icon class="size-5" />
					</div>
					<Card.Title class="flex items-center gap-2">
						{demo.name}
						{#if demo.href === null}
							<Badge
								variant="outline"
								class="text-muted-foreground font-normal"
								data-testid="demo-soon-{demo.id}"
							>
								Coming soon
							</Badge>
						{/if}
					</Card.Title>
					<Card.Description>{demo.blurb}</Card.Description>
				</Card.Header>
				<Card.Footer class="mt-auto flex items-center justify-between gap-2">
					<code class="text-muted-foreground text-xs">{demo.module}</code>
					{#if demo.href}
						<Button
							href={demo.href}
							size="sm"
							variant="outline"
							data-testid="demo-link-{demo.id}"
						>
							Open demo
							<ArrowRightIcon class="size-4" />
						</Button>
					{:else}
						<span class="text-muted-foreground text-xs italic">demo coming soon</span>
					{/if}
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>

	<!-- These interactive demos are a curated slice; the full zero-dependency
	 toolbox (emitter, pipe, result, retry, unicode, and more) is
	 catalogued in the generated src/README.md. -->
	<Card.Root
		class="from-primary/5 mt-4 bg-gradient-to-br to-transparent"
		data-testid="toolbox-catalog"
	>
		<Card.Header
			class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
		>
			<div class="flex items-start gap-3">
				<div
					class="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
				>
					<LibraryBigIcon class="size-5" />
				</div>
				<div class="space-y-1">
					<Card.Title>The full toolbox</Card.Title>
					<Card.Description>
						<!-- Interpolated, not spelled out: the previous hard-coded "four"
						 went stale the moment a fifth demo landed. -->
						These demos showcase {demos.length} of the monorepo's zero-dependency
						<code class="bg-muted rounded px-1 py-0.5 text-xs">src/</code>
						libraries. The complete, auto-generated catalog lists every module.
					</Card.Description>
				</div>
			</div>
			<Button
				href="https://github.com/startino/testing/blob/alpha/src/README.md"
				target="_blank"
				rel="noopener noreferrer"
				variant="outline"
				class="shrink-0"
				data-testid="toolbox-catalog-link"
			>
				Browse catalog
				<ArrowRightIcon class="size-4" />
			</Button>
		</Card.Header>
	</Card.Root>
</section>
