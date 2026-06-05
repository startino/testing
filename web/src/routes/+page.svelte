<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import ComponentIcon from '@lucide/svelte/icons/component';
	import MoonStarIcon from '@lucide/svelte/icons/moon-star';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import GithubIcon from '$lib/components/github-icon.svelte';

	const features = [
		{
			icon: PaletteIcon,
			title: 'Tailwind CSS v4',
			body: 'Styled with the v4 engine via @tailwindcss/vite and tw-animate-css. Design tokens live as OKLCH custom properties for crisp light and dark themes.',
		},
		{
			icon: ComponentIcon,
			title: 'shadcn-svelte',
			body: 'Accessible, composable UI primitives built on bits-ui. Owned in-tree under src/lib/components/ui -- copy, tweak, and ship.',
		},
		{
			icon: MoonStarIcon,
			title: 'Dark mode, built in',
			body: 'mode-watcher drives a no-flash light and dark theme with a one-click toggle in the header. Defaults to a tasteful dark palette.',
		},
		{
			icon: RocketIcon,
			title: 'Deploy ready',
			body: 'adapter-node produces a standalone server that listens on $PORT. RAILPACK autodetects Node -- no Dockerfile required.',
		},
	];
</script>

<svelte:head>
	<title>Startino Testing Sandbox</title>
	<meta
		name="description"
		content="A polished SvelteKit + Tailwind v4 + shadcn-svelte scaffold, Station-styled. The Startino testing sandbox app."
	/>
</svelte:head>

<section class="relative overflow-hidden">
	<div
		class="bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.primary/8%),transparent)] pointer-events-none absolute inset-0 -z-10"
	></div>
	<div class="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
		<Badge variant="secondary" class="gap-1.5">
			<span class="bg-primary size-1.5 rounded-full"></span>
			Startino &middot; testing sandbox
		</Badge>

		<h1
			class="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
		>
			A clean SvelteKit scaffold, ready to build on.
		</h1>

		<p class="text-muted-foreground max-w-2xl text-lg text-pretty">
			This is the Startino <span class="text-foreground font-medium">testing</span>
			sandbox app: SvelteKit + TypeScript, Tailwind CSS v4, and shadcn-svelte components -- styled
			the way Station builds its UI, but fully public and self-contained. No auth, no database,
			just a polished starting point.
		</p>

		<div class="flex flex-wrap items-center justify-center gap-3 pt-2">
			<Button href="/components" size="lg">
				Explore components
				<ArrowRightIcon class="size-4" />
			</Button>
			<Button
				href="https://github.com/startino/testing"
				target="_blank"
				rel="noopener noreferrer"
				variant="outline"
				size="lg"
			>
				<GithubIcon class="size-4" />
				View on GitHub
			</Button>
		</div>
	</div>
</section>

<section class="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
	<div class="grid gap-4 sm:grid-cols-2">
		{#each features as feature (feature.title)}
			{@const Icon = feature.icon}
			<Card.Root class="h-full">
				<Card.Header>
					<div
						class="bg-muted text-foreground mb-2 flex size-9 items-center justify-center rounded-lg"
					>
						<Icon class="size-5" />
					</div>
					<Card.Title>{feature.title}</Card.Title>
					<Card.Description>{feature.body}</Card.Description>
				</Card.Header>
			</Card.Root>
		{/each}
	</div>

	<Card.Root class="from-primary/5 mt-4 bg-gradient-to-br to-transparent">
		<Card.Header
			class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
		>
			<div class="space-y-1">
				<Card.Title>See the UI layer in action</Card.Title>
				<Card.Description>
					A live showcase of buttons, cards, dialogs, tabs, and more -- proof the scaffold
					renders end to end.
				</Card.Description>
			</div>
			<Button href="/components" class="shrink-0">
				Open showcase
				<ArrowRightIcon class="size-4" />
			</Button>
		</Card.Header>
	</Card.Root>
</section>
