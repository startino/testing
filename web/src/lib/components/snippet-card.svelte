<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { copyToClipboard } from '$lib/clipboard.js';
	import { toast } from '$lib/toast.js';

	let {
		snippet,
	}: {
		snippet: { id: string; title: string; lang: string; code: string; html: string };
	} = $props();

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => () => clearTimeout(resetTimer));

	async function onCopy() {
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
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between gap-2">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<Card.Title class="truncate">{snippet.title}</Card.Title>
			<Badge variant="secondary">{snippet.lang}</Badge>
		</div>
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={`Copy ${snippet.title} code`}
			onclick={onCopy}
		>
			{#if copied}
				<CheckIcon />
			{:else}
				<CopyIcon />
			{/if}
		</Button>
	</Card.Header>
	<Card.Content>
		<!-- Safe: server-highlighted static HTML from our own snippets -->
		<div class="bg-muted/50 overflow-x-auto rounded-lg p-4 text-sm">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- build-time Shiki output -->
			{@html snippet.html}
		</div>
	</Card.Content>
</Card.Root>
