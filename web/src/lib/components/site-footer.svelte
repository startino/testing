<script lang="ts">
	import { onMount } from 'svelte';

	// Seeded from build time for the prerendered HTML, then corrected to the
	// user's current year once mounted in the browser (onMount runs client-side
	// only) so a stale prerendered build never freezes the copyright date.
	let year = $state(new Date().getFullYear());

	onMount(() => {
		year = new Date().getFullYear();
	});
</script>

<footer class="border-t">
	<div
		class="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm sm:flex-row sm:px-6"
	>
		<p>&copy; {year} Startino &mdash; testing sandbox.</p>
		<p class="flex items-center gap-3">
			<span>SvelteKit + Tailwind v4 + shadcn-svelte</span>
			<a
				href="https://github.com/startino/testing"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-foreground underline-offset-4 hover:underline"
			>
				GitHub
			</a>
		</p>
	</div>
</footer>
