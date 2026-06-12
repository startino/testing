<script lang="ts">
	import { toast } from '$lib/toast';
	import { fly, fade } from 'svelte/transition';

	// Subscribe via the auto-store ($toast) -- Svelte unsubscribes automatically on
	// unmount. Additionally, clear any pending dismiss timers when this viewport
	// unmounts so no timer fires after teardown (the explicit leak-defense).
	$effect(() => {
		return () => toast._clearAllTimers();
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
	aria-live="polite"
	role="status"
>
	{#each $toast as t (t.id)}
		<div
			in:fly={{ y: 12, duration: 150 }}
			out:fade={{ duration: 150 }}
			class="bg-popover text-popover-foreground ring-foreground/10 pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-md ring-1"
		>
			{t.message}
		</div>
	{/each}
</div>
