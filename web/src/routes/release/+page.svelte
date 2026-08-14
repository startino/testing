<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		RELEASE_STORAGE_KEY,
		createReleaseChecklistState,
		getReleaseProgress,
		getVisibleReleaseGroups,
		restoreReleaseChecklistState,
		serializeReleaseChecklistState,
		type ReleaseChecklistItemState,
		type ReleaseView,
	} from '$lib/release-checklist.js';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Rocket from '@lucide/svelte/icons/rocket';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import UserRound from '@lucide/svelte/icons/user-round';

	let checklist = $state(createReleaseChecklistState());
	let activeView = $state<ReleaseView>('all');
	let hydrated = $state(false);
	let storageAvailable = $state(true);
	let resetOpen = $state(false);
	let progress = $derived(getReleaseProgress(checklist));
	let visibleGroups = $derived(getVisibleReleaseGroups(checklist, activeView));

	const views: ReadonlyArray<{ id: ReleaseView; label: string }> = [
		{ id: 'all', label: 'All' },
		{ id: 'remaining', label: 'Remaining' },
		{ id: 'completed', label: 'Completed' },
	];

	function updateItem(id: string, changes: Partial<ReleaseChecklistItemState>) {
		checklist = {
			items: {
				...checklist.items,
				[id]: { ...checklist.items[id], ...changes },
			},
		};
	}

	function persistChecklist() {
		try {
			localStorage.setItem(RELEASE_STORAGE_KEY, serializeReleaseChecklistState(checklist));
			storageAvailable = true;
		} catch {
			storageAvailable = false;
		}
	}

	function resetChecklist() {
		checklist = createReleaseChecklistState();
		activeView = 'all';
		persistChecklist();
		resetOpen = false;
	}

	onMount(() => {
		try {
			checklist = restoreReleaseChecklistState(localStorage.getItem(RELEASE_STORAGE_KEY));
		} catch {
			checklist = createReleaseChecklistState();
			storageAvailable = false;
		} finally {
			hydrated = true;
		}
	});

	$effect(() => {
		if (!hydrated) return;
		persistChecklist();
	});
</script>

<svelte:head>
	<title>Release readiness | Startino Sandbox</title>
	<meta
		name="description"
		content="Prepare a web release with a practical checklist, clear ownership, due dates, and browser-local progress."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
	<header class="mb-8 space-y-3">
		<div class="flex items-center gap-2">
			<Rocket class="text-muted-foreground size-5" aria-hidden="true" />
			<p class="text-muted-foreground text-sm font-medium">One release, one clear plan</p>
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Release readiness</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			Prepare the work, verify the experience, launch with confidence, and follow through.
		</p>
		<p class="text-muted-foreground text-sm">
			{storageAvailable
				? 'Progress is saved on this device.'
				: 'Changes are available for this session, but this browser could not save them.'}
		</p>
	</header>

	<Card.Root class="mb-6 overflow-hidden">
		<Card.Header class="gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="space-y-2">
				<Badge variant={progress.percent === 100 ? 'default' : 'secondary'}>
					{progress.percent === 100 ? 'Release ready' : 'In progress'}
				</Badge>
				<div class="flex items-start gap-3">
					{#if progress.percent === 100}
						<CheckCircle2 class="mt-0.5 size-6 shrink-0" aria-hidden="true" />
					{:else}
						<CircleDashed
							class="text-muted-foreground mt-0.5 size-6 shrink-0"
							aria-hidden="true"
						/>
					{/if}
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							{progress.percent === 100
								? 'Ready to release'
								: `${progress.remaining} items remaining`}
						</h2>
						<p class="text-muted-foreground mt-1 text-sm">
							{progress.percent === 100
								? 'Every checklist item is complete. Reopen any item if plans change.'
								: 'Keep moving through the checklist at a steady pace.'}
						</p>
					</div>
				</div>
			</div>
			<div class="sm:text-right">
				<p class="text-2xl font-semibold tabular-nums">
					{progress.completed} of {progress.total}
				</p>
				<p class="text-muted-foreground text-sm tabular-nums">
					{progress.percent}% complete
				</p>
			</div>
		</Card.Header>
		<Card.Content class="space-y-2">
			<progress
				class="bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary h-2 w-full overflow-hidden rounded-full"
				max={progress.total}
				value={progress.completed}
				aria-label="Release checklist progress"
			></progress>
			<p class="sr-only" aria-live="polite">
				{progress.completed} of {progress.total} checklist items complete. {progress.percent}%
				complete.
			</p>
		</Card.Content>
	</Card.Root>

	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-2">
			<p id="release-view-label" class="text-sm font-medium">Status view</p>
			<div class="flex flex-wrap gap-2" role="group" aria-labelledby="release-view-label">
				{#each views as view (view.id)}
					<Button
						variant={activeView === view.id ? 'secondary' : 'outline'}
						class="min-h-11"
						aria-pressed={activeView === view.id}
						onclick={() => (activeView = view.id)}
					>
						{view.label}
					</Button>
				{/each}
			</div>
		</div>

		<Dialog.Root bind:open={resetOpen}>
			<Dialog.Trigger class={buttonVariants({ variant: 'outline', class: 'min-h-11' })}>
				<RotateCcw aria-hidden="true" />
				Reset checklist
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Reset release checklist?</Dialog.Title>
					<Dialog.Description>
						Confirmation clears all completion, owner, and due-date values on this
						device.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>
						Cancel
					</Dialog.Close>
					<Button variant="destructive" onclick={resetChecklist}>Reset checklist</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	{#if visibleGroups.length > 0}
		<div class="space-y-5">
			{#each visibleGroups as group (group.phase.id)}
				<Card.Root>
					<Card.Header class="border-b">
						<Card.Title>{group.phase.label}</Card.Title>
					</Card.Header>
					<Card.Content class="divide-y px-0">
						{#each group.items as definition (definition.id)}
							{@const item = checklist.items[definition.id]}
							<div
								class="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_13rem_11rem] md:items-end"
							>
								<div class="flex min-h-11 items-center gap-3">
									<input
										id={`release-complete-${definition.id}`}
										type="checkbox"
										class="border-input accent-primary size-5 shrink-0 rounded"
										checked={item.completed}
										onchange={(event) =>
											updateItem(definition.id, {
												completed: event.currentTarget.checked,
											})}
									/>
									<Label
										for={`release-complete-${definition.id}`}
										class={[
											'min-h-11 cursor-pointer items-center text-base leading-snug whitespace-normal',
											item.completed && 'text-muted-foreground line-through',
										]}
									>
										{definition.label}
									</Label>
								</div>
								<div class="space-y-2">
									<Label for={`release-owner-${definition.id}`} class="gap-1.5">
										<UserRound class="size-3.5" aria-hidden="true" /> Owner
									</Label>
									<Input
										id={`release-owner-${definition.id}`}
										value={item.owner}
										maxlength={80}
										autocomplete="off"
										class="min-h-11"
										placeholder="Add owner"
										oninput={(event) =>
											updateItem(definition.id, {
												owner: event.currentTarget.value,
											})}
									/>
								</div>
								<div class="space-y-2">
									<Label for={`release-due-${definition.id}`} class="gap-1.5">
										<CalendarDays class="size-3.5" aria-hidden="true" /> Due date
									</Label>
									<Input
										id={`release-due-${definition.id}`}
										type="date"
										value={item.dueDate}
										autocomplete="off"
										class="min-h-11"
										oninput={(event) =>
											updateItem(definition.id, {
												dueDate: event.currentTarget.value,
											})}
									/>
								</div>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if activeView === 'completed'}
		<Card.Root>
			<Card.Content class="flex flex-col items-start gap-3 py-8">
				<CircleDashed class="text-muted-foreground size-7" aria-hidden="true" />
				<div>
					<h2 class="font-semibold">No completed items yet</h2>
					<p class="text-muted-foreground mt-1 text-sm">
						Start with the open checklist and mark work as it finishes.
					</p>
				</div>
				<Button
					variant="outline"
					class="min-h-11"
					onclick={() => (activeView = 'remaining')}
				>
					Show remaining work
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if activeView === 'remaining'}
		<Card.Root>
			<Card.Content class="flex flex-col items-start gap-3 py-8">
				<CheckCircle2 class="size-7" aria-hidden="true" />
				<div>
					<h2 class="font-semibold">Ready to release</h2>
					<p class="text-muted-foreground mt-1 text-sm">
						There is no remaining work in this checklist.
					</p>
				</div>
				<Button
					variant="outline"
					class="min-h-11"
					onclick={() => (activeView = 'completed')}
				>
					View completed checklist
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
