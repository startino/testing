<script lang="ts">
	import { getToasts, dismissToast, clearAllToastTimers } from '$lib/toast.svelte.js';

	$effect(() => {
		return () => clearAllToastTimers();
	});
</script>

<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
	{#each getToasts() as t (t.id)}
		<button
			type="button"
			class="bg-card text-card-foreground border-border rounded-lg border px-3 py-2 text-sm shadow-md"
			onclick={() => dismissToast(t.id)}
		>
			{t.message}
		</button>
	{/each}
</div>
