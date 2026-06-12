<style>
	/* Shiki emits a <pre class="shiki ..."> whose background is var(--shiki-background)
	   (transparent, set in app.css) so it sits on our own bg-muted surface. Ensure the
	   code uses the design-system mono font and reads comfortably. */
	.snippet-code :global(pre.shiki) {
		margin: 0;
		background: transparent;
		font-family: var(--font-mono);
		line-height: 1.6;
	}

	.snippet-code :global(pre.shiki code) {
		display: block;
		font-family: inherit;
	}
</style>

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { copyToClipboard } from '$lib/clipboard';
	import { toast } from '$lib/toast';
	import type { Lang } from '$lib/snippets';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';

	let {
		snippet,
	}: {
		snippet: { id: string; title: string; lang: Lang; code: string; html: string };
	} = $props();

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function onCopy() {
		// Copies the RAW snippet source -- not the highlighted HTML / not innerText.
		const ok = await copyToClipboard(snippet.code);
		if (ok) {
			copied = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (copied = false), 1200);
			toast.show('Copied to clipboard');
		} else {
			toast.show('Copy failed');
		}
	}

	// Clear the copy-icon reset timer on unmount so it never fires after teardown.
	$effect(() => () => clearTimeout(resetTimer));
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center gap-3">
		<Card.Title>{snippet.title}</Card.Title>
		<Badge variant="secondary">{snippet.lang}</Badge>
		<Button
			variant="ghost"
			size="icon-sm"
			class="ml-auto"
			aria-label={`Copy ${snippet.title} code`}
			title="Copy to clipboard"
			onclick={onCopy}
		>
			{#if copied}
				<CheckIcon class="size-4" />
			{:else}
				<CopyIcon class="size-4" />
			{/if}
		</Button>
	</Card.Header>
	<Card.Content>
		<!--
			{@html snippet.html} is safe: the content originates from our own static
			snippets.ts, highlighted server-side by Shiki during prerender. No user
			input is ever interpolated here.
		-->
		<div class="snippet-code bg-muted/50 overflow-x-auto rounded-lg p-4 text-sm">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, server-rendered Shiki HTML (see comment above); no user input -->
			{@html snippet.html}
		</div>
	</Card.Content>
</Card.Root>
