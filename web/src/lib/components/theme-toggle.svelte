<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleMode}
	aria-label="Toggle light and dark theme"
	title="Toggle theme"
>
	{#if mode.current === 'dark'}
		<MoonIcon class="size-4" />
	{:else}
		<SunIcon class="size-4" />
	{/if}
</Button>
