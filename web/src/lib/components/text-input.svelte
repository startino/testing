<script lang="ts">
	import type { HTMLInputTypeAttribute } from 'svelte/elements';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	type Props = {
		label: string;
		value?: string;
		placeholder: string;
		type?: Exclude<HTMLInputTypeAttribute, 'file'>;
	};

	let { label, value = $bindable(''), placeholder, type = 'text' }: Props = $props();
	const inputId = $props.id();
</script>

<div class="space-y-2">
	<Label for={inputId}>{label}</Label>
	<Input id={inputId} {type} {placeholder} bind:value />
</div>
