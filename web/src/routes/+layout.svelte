<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import SiteHeader from '$lib/components/site-header.svelte';
	import SiteFooter from '$lib/components/site-footer.svelte';
	import Toaster from '$lib/components/toaster.svelte';

	let { children } = $props();
</script>

<ModeWatcher defaultMode="dark" />

<div class="flex min-h-screen flex-col">
	<SiteHeader />
	<main class="flex-1">
		{@render children?.()}
	</main>
	<SiteFooter />
	<Toaster />
</div>
