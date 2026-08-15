<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	// app.html carries no fallback <title>: the page owns it, so that a stale
	// scaffold title can never outrank what a route declares. The error route
	// has to declare its own, or a 404 ships with an empty browser tab.
	let heading = $derived(page.status === 404 ? 'Page not found' : 'Something went wrong');
	let detail = $derived(
		page.status === 404
			? 'This address is not part of Release Readiness. The checklist is the whole product.'
			: (page.error?.message ?? 'The page could not be loaded.')
	);
</script>

<svelte:head>
	<title>{heading}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
	<Card.Root>
		<Card.Header class="gap-3">
			<div
				class="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg"
			>
				<CircleAlert class="size-5" aria-hidden="true" />
			</div>
			<Card.Title class="text-2xl">{heading}</Card.Title>
			<Card.Description>{detail}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-muted-foreground text-sm tabular-nums">Status {page.status}</p>
		</Card.Content>
		<Card.Footer>
			<Button href="/" class="min-h-11">Open the release checklist</Button>
		</Card.Footer>
	</Card.Root>
</div>
