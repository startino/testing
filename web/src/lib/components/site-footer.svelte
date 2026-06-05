<script lang="ts">
	const year = new Date().getFullYear();
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
