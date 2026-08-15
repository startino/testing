<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import GithubIcon from '$lib/components/github-icon.svelte';
	import Rocket from '@lucide/svelte/icons/rocket';
</script>

<header
	class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur"
>
	<div class="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			<span
				class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md"
			>
				<Rocket class="size-4" aria-hidden="true" />
			</span>
			<span>Release Readiness</span>
		</a>

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
