<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let email = $state('');
</script>

<svelte:head>
	<title>Components -- Startino Testing Sandbox</title>
	<meta
		name="description"
		content="A live showcase of shadcn-svelte components rendering in the Startino testing sandbox scaffold."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
	<header class="mb-10 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Component showcase</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A representative slice of the shadcn-svelte layer, rendering live. If you can see and
			use everything below, the UI stack is wired correctly end to end.
		</p>
	</header>

	<div class="space-y-12">
		<!-- Buttons -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Buttons</h2>
				<p class="text-muted-foreground text-sm">Variants and sizes.</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<Button>Default</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="link">Link</Button>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<Button size="sm">Small</Button>
				<Button>Default</Button>
				<Button size="lg">Large</Button>
				<Button disabled>Disabled</Button>
			</div>
		</section>

		<Separator />

		<!-- Badges -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Badges</h2>
				<p class="text-muted-foreground text-sm">Compact status labels.</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<Badge>Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="outline">Outline</Badge>
				<Badge variant="destructive">Destructive</Badge>
			</div>
		</section>

		<Separator />

		<!-- Form: Input + Label inside a Card -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Inputs &amp; Cards</h2>
				<p class="text-muted-foreground text-sm">Labeled fields composed inside a card.</p>
			</div>
			<Card.Root class="max-w-md">
				<Card.Header>
					<Card.Title>Join the waitlist</Card.Title>
					<Card.Description>
						This form is inert -- it is a layout demo only.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input id="name" placeholder="Ada Lovelace" />
					</div>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="ada@example.com"
							bind:value={email}
						/>
						{#if email}
							<p class="text-muted-foreground text-xs">You typed: {email}</p>
						{/if}
					</div>
				</Card.Content>
				<Card.Footer>
					<Button class="w-full">Sign up</Button>
				</Card.Footer>
			</Card.Root>
		</section>

		<Separator />

		<!-- Dialog -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Dialog</h2>
				<p class="text-muted-foreground text-sm">A focus-trapped modal overlay.</p>
			</div>
			<Dialog.Root>
				<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
					Open dialog
				</Dialog.Trigger>
				<Dialog.Content class="sm:max-w-md">
					<Dialog.Header>
						<Dialog.Title>Scaffold confirmed</Dialog.Title>
						<Dialog.Description>
							If you are reading this in a modal, the dialog primitive, portal,
							overlay, and focus trap all work.
						</Dialog.Description>
					</Dialog.Header>
					<Dialog.Footer>
						<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>
							Close
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</section>

		<Separator />

		<!-- Tabs -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Tabs</h2>
				<p class="text-muted-foreground text-sm">Switch between panels of content.</p>
			</div>
			<Tabs.Root value="overview" class="max-w-md">
				<Tabs.List>
					<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
					<Tabs.Trigger value="details">Details</Tabs.Trigger>
					<Tabs.Trigger value="more">More</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="overview" class="text-muted-foreground pt-3 text-sm">
					Tabs are driven by bits-ui with full keyboard support.
				</Tabs.Content>
				<Tabs.Content value="details" class="text-muted-foreground pt-3 text-sm">
					The active panel swaps without a navigation, all client-side.
				</Tabs.Content>
				<Tabs.Content value="more" class="text-muted-foreground pt-3 text-sm">
					Arrow keys move between triggers; Home and End jump to the ends.
				</Tabs.Content>
			</Tabs.Root>
		</section>

		<Separator />

		<!-- Avatar -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Avatars</h2>
				<p class="text-muted-foreground text-sm">
					Image with a graceful initials fallback.
				</p>
			</div>
			<div class="flex items-center gap-4">
				<Avatar.Root>
					<Avatar.Image src="https://github.com/sveltejs.png" alt="Svelte" />
					<Avatar.Fallback>SV</Avatar.Fallback>
				</Avatar.Root>
				<Avatar.Root>
					<Avatar.Image src="" alt="Fallback only" />
					<Avatar.Fallback>ST</Avatar.Fallback>
				</Avatar.Root>
			</div>
		</section>

		<Separator />

		<!-- Alerts -->
		<section class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Alerts</h2>
				<p class="text-muted-foreground text-sm">Inline, non-blocking messages.</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Alert.Root>
					<InfoIcon class="size-4" />
					<Alert.Title>Heads up</Alert.Title>
					<Alert.Description>
						This scaffold ships with no backend -- it is intentionally public and
						static.
					</Alert.Description>
				</Alert.Root>
				<Alert.Root variant="destructive">
					<TriangleAlertIcon class="size-4" />
					<Alert.Title>Destructive</Alert.Title>
					<Alert.Description>
						Use this variant for errors and irreversible actions.
					</Alert.Description>
				</Alert.Root>
			</div>
		</section>
	</div>
</div>
