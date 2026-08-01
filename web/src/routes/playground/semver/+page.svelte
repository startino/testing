<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import TagsIcon from '@lucide/svelte/icons/tags';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { parse, compare, satisfies } from '$lib/semver.js';
	import {
		SEMVER_PARSE_PRESETS,
		SEMVER_COMPARE_PRESETS,
		SEMVER_SATISFIES_PRESETS,
	} from '$lib/semver-presets.js';

	// Pure local UI state -- no backend. All three previews are computed through
	// the SAME shipped SemVer library the monorepo ships, so what renders is the
	// library's real, fail-closed output on every keystroke.

	// Parse: version string -> fields, or null for anything outside the strict
	// SemVer 2.0.0 grammar.
	let versionText = $state('1.0.0-beta.2+exp.sha.5114f85');
	const parsed = $derived.by(() => {
		// The library does NO trimming by design -- surrounding whitespace is a
		// hard rejection there. Trimming belongs to the UI layer instead, so a
		// stray space from a paste does not read as "invalid version" to a user
		// who typed a perfectly good one. The library stays strict; the input box
		// normalizes. Never push this trim down into src/semver.
		const trimmed = versionText.trim();
		// An empty box is not the same event as a rejected string: one means "you
		// have not told me anything yet", the other means "I read this and said
		// no". Collapsing them would teach the wrong lesson about fail-closed.
		if (trimmed === '') return { state: 'empty' as const };
		const out = parse(trimmed);
		return out === null ? { state: 'invalid' as const } : { state: 'ok' as const, out };
	});

	// Compare: two version strings -> -1 | 0 | 1, or null when EITHER side fails
	// to parse. Raw (untrimmed) values go in on purpose here -- this panel is
	// where the fail-closed null is the point, so a padded string should show it.
	let compareA = $state('1.0.0-alpha');
	let compareB = $state('1.0.0');
	const comparison = $derived(compare(compareA, compareB));
	// The sign IS the relation; render it as the inequality a reader thinks in
	// rather than making them decode -1/0/1. The raw value is shown beside it
	// because that is what a caller of `compare` actually receives.
	const relation = $derived(
		comparison === -1 ? 'a < b' : comparison === 0 ? 'a = b' : comparison === 1 ? 'a > b' : null
	);

	// Satisfies: version + range -> boolean. Never null, never a throw -- an
	// unsupported range form answers false, exactly like a genuine mismatch.
	let satisfiesVersion = $state('1.9.0');
	let satisfiesRange = $state('^1.2.3');
	const satisfied = $derived(satisfies(satisfiesVersion, satisfiesRange));
</script>

<svelte:head>
	<title>SemVer playground -- Startino Sandbox</title>
	<meta
		name="description"
		content="Interactive playground for the monorepo's zero-dependency src/semver library: parse strict SemVer 2.0.0 versions, compare them by precedence, and test them against caret, tilde, and exact ranges."
	/>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<div class="flex flex-col items-start gap-3">
		<a
			href="/playground"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
		>
			<ArrowLeftIcon class="size-4" />
			Playground
		</a>
		<div class="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
			<TagsIcon class="size-5" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">SemVer playground</h1>
		<p class="text-muted-foreground max-w-2xl text-pretty">
			A live demo of this monorepo's zero-dependency <code
				class="bg-muted rounded px-1.5 py-0.5 text-sm"
			>
				src/semver
			</code>
			library.
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">parse</code>
			reads
			<em>strict</em>
			SemVer 2.0.0 and nothing else -- no
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">v</code>
			prefix, no partial versions, no trimming.
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">compare</code>
			orders two versions by precedence, and
			<code class="bg-muted rounded px-1.5 py-0.5 text-sm">satisfies</code>
			tests one against a range. All three run in your browser against the real shipped library.
		</p>
	</div>

	<!-- Parse: version string -> fields (strict SemVer 2.0.0) -->
	<Card.Root class="mt-8">
		<Card.Header>
			<Card.Title>Parse</Card.Title>
			<Card.Description>
				<code class="text-xs">parse(version)</code>
				-- a strict SemVer 2.0.0 string to its fields.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="space-y-2">
				<Label for="semver-parse-input">Version string</Label>
				<Input
					id="semver-parse-input"
					bind:value={versionText}
					autocomplete="off"
					placeholder="e.g. 1.0.0-alpha.1"
					data-testid="semver-parse-input"
				/>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Parsed fields</span>
				<div
					class="bg-muted/50 min-h-11 rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="semver-parse-output"
				>
					{#if parsed.state === 'ok'}
						<dl class="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1">
							<dt class="text-muted-foreground">major.minor.patch</dt>
							<dd class="text-foreground">
								{parsed.out.major}.{parsed.out.minor}.{parsed.out.patch}
							</dd>
							<dt class="text-muted-foreground">prerelease</dt>
							<dd class="text-foreground">
								{#if parsed.out.prerelease.length > 0}
									<!-- Numeric identifiers come back as NUMBERS and alphanumeric
									 ones as STRINGS; the type IS the precedence classification,
									 so it is worth showing rather than flattening to text. -->
									[{parsed.out.prerelease
										.map((id) => (typeof id === 'number' ? id : `"${id}"`))
										.join(', ')}]
								{:else}
									<span class="text-muted-foreground italic">(none)</span>
								{/if}
							</dd>
							<dt class="text-muted-foreground">build</dt>
							<dd class="text-foreground">
								{#if parsed.out.build.length > 0}
									<!-- Build identifiers are kept verbatim (leading zeros and
									 all) because they are never compared. -->
									[{parsed.out.build.map((id) => `"${id}"`).join(', ')}]
								{:else}
									<span class="text-muted-foreground italic">(none)</span>
								{/if}
							</dd>
						</dl>
					{:else if parsed.state === 'empty'}
						<span class="text-muted-foreground italic">
							(type a version string above)
						</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- not a strict SemVer 2.0.0 version)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each SEMVER_PARSE_PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (versionText = preset.input)}
							data-testid="semver-parse-preset-{preset.label}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Compare: two version strings -> precedence relation -->
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>Compare</Card.Title>
			<Card.Description>
				<code class="text-xs">compare(a, b)</code>
				-- SemVer precedence; build metadata is ignored entirely.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="semver-compare-a-input">Version a</Label>
					<Input
						id="semver-compare-a-input"
						bind:value={compareA}
						autocomplete="off"
						placeholder="e.g. 1.0.0-alpha"
						data-testid="semver-compare-a-input"
					/>
				</div>
				<div class="space-y-2">
					<Label for="semver-compare-b-input">Version b</Label>
					<Input
						id="semver-compare-b-input"
						bind:value={compareB}
						autocomplete="off"
						placeholder="e.g. 1.0.0"
						data-testid="semver-compare-b-input"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Precedence</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="semver-compare-output"
				>
					{#if relation !== null}
						<span class="text-foreground">{relation}</span>
						<span class="text-muted-foreground ml-2">(returns {comparison})</span>
					{:else}
						<span class="text-muted-foreground italic">
							(fail-closed -- one side is not a valid version, so no ordering is
							guessed)
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each SEMVER_COMPARE_PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								compareA = preset.a;
								compareB = preset.b;
							}}
							data-testid="semver-compare-preset-{preset.label}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Satisfies: version + range -> boolean (caret / tilde / exact only) -->
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>Satisfies</Card.Title>
			<Card.Description>
				<code class="text-xs">satisfies(version, range)</code>
				-- the supported range grammar is
				<code class="text-xs">1.2.3</code>
				(exact),
				<code class="text-xs">^1.2.3</code>
				, and
				<code class="text-xs">~1.2.3</code>
				only. Every richer npm form -- comparators, x-ranges,
				<code class="text-xs">*</code>
				, hyphen ranges, and
				<code class="text-xs">||</code>
				unions -- answers false rather than half-understanding you.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="semver-satisfies-version-input">Version</Label>
					<Input
						id="semver-satisfies-version-input"
						bind:value={satisfiesVersion}
						autocomplete="off"
						placeholder="e.g. 1.9.0"
						data-testid="semver-satisfies-version-input"
					/>
				</div>
				<div class="space-y-2">
					<Label for="semver-satisfies-range-input">Range</Label>
					<Input
						id="semver-satisfies-range-input"
						bind:value={satisfiesRange}
						autocomplete="off"
						placeholder="e.g. ^1.2.3"
						data-testid="semver-satisfies-range-input"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Result</span>
				<div
					class="bg-muted/50 flex min-h-11 items-center rounded-lg border px-3 py-2 font-mono text-sm break-all"
					aria-live="polite"
					data-testid="semver-satisfies-output"
				>
					{#if satisfied}
						<span class="text-foreground">satisfied -- returns true</span>
					{:else}
						<!-- One false covers both "does not match" and "unsupported range";
						 the predicate has no third state, so the copy says so plainly. -->
						<span class="text-foreground">
							not satisfied -- returns false
							<span class="text-muted-foreground italic">
								(a mismatch and an unsupported range read the same)
							</span>
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-muted-foreground text-sm font-medium">Presets</span>
				<div class="flex flex-wrap gap-2">
					{#each SEMVER_SATISFIES_PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								satisfiesVersion = preset.version;
								satisfiesRange = preset.range;
							}}
							data-testid="semver-satisfies-preset-{preset.label}"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</section>
