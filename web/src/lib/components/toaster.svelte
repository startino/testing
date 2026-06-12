<script lang="ts">
	import { getToasts, dismissToast, clearAllToastTimers } from '$lib/toast.svelte.js';
	import XIcon from '@lucide/svelte/icons/x';

	// Leak cleanup: on unmount, clear every pending auto-dismiss timer.
	$effect(() => {
		return () => clearAllToastTimers();
	});
</script>

<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="true">
	{#each getToasts() as t (t.id)}
		<div
			class="bg-card text-card-foreground border-border flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-md"
			role="status"
		>
			<span class="font-mono">{t.message}</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground ml-1 transition-colors"
				aria-label="Dismiss"
				onclick={() => dismissToast(t.id)}
			>
				<XIcon class="size-3.5" />
			</button>
		</div>
	{/each}
</div>
