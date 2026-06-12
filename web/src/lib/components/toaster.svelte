<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { toast } from '$lib/toast.js';

	$effect(() => () => toast._clearAllTimers());
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
	aria-live="polite"
	role="status"
>
	{#each $toast as item (item.id)}
		<div
			class="bg-popover text-popover-foreground ring-border pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-md ring-1"
			in:fly={{ y: 16, duration: 200 }}
			out:fade={{ duration: 150 }}
		>
			{item.message}
		</div>
	{/each}
</div>
