<script lang="ts" module>
	export type StatCardTrendDirection = 'up' | 'down' | 'neutral';

	export type StatCardTrend = {
		value: string;
		label?: string;
		direction?: StatCardTrendDirection;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let {
		ref = $bindable(null),
		class: className,
		title,
		value,
		description,
		trend,
		icon,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		title: string;
		value: string | number;
		description?: string;
		trend?: StatCardTrend;
		icon?: Snippet;
	} = $props();

	const trendClass: Record<StatCardTrendDirection, string> = {
		up: 'text-emerald-600 dark:text-emerald-400',
		down: 'text-destructive',
		neutral: 'text-muted-foreground',
	};
</script>

<Card.Root
	bind:ref
	data-slot="stat-card"
	class={cn('min-w-0 gap-3', className)}
	{...restProps}
>
	<Card.Header class="flex-row items-start justify-between gap-3">
		<div class="min-w-0 space-y-1">
			<Card.Description>{title}</Card.Description>
			<Card.Title class="truncate text-2xl leading-none font-semibold tabular-nums">
				{value}
			</Card.Title>
		</div>
		{#if icon}
			<div
				data-slot="stat-card-icon"
				class="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
				aria-hidden="true"
			>
				{@render icon()}
			</div>
		{/if}
	</Card.Header>

	{#if description || trend}
		<Card.Content class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
			{#if trend}
				<span
					data-slot="stat-card-trend"
					data-trend={trend.direction ?? 'neutral'}
					class={cn('font-medium tabular-nums', trendClass[trend.direction ?? 'neutral'])}
				>
					{trend.value}
				</span>
				{#if trend.label}
					<span class="text-muted-foreground">{trend.label}</span>
				{/if}
			{/if}
			{#if description}
				<span class="text-muted-foreground">{description}</span>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
