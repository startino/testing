<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import GithubIcon from '$lib/components/github-icon.svelte';

	const nav = [
		{ href: '/', label: 'Home' },
		{ href: '/components', label: 'Components' },
		{ href: '/calc', label: 'Calculator' },
	];

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<header
	class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur"
>
	<div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			<span
				class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold"
			>
				S
			</span>
			<span class="hidden sm:inline">Startino Sandbox</span>
		</a>

		<nav class="flex items-center gap-1 text-sm">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class={[
						'rounded-md px-3 py-1.5 transition-colors',
						isActive(item.href)
							? 'bg-muted text-foreground font-medium'
							: 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
					]}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				href="https://github.com/startino/testing"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub repository"
				title="GitHub: startino/testing"
			>
				<GithubIcon class="size-4" />
			</Button>
			<ThemeToggle />
		</div>
	</div>
</header>
