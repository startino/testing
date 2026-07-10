// Preset inputs for the /playground/slugify demo, each chosen to exercise a
// distinct facet of the shipped slug library: unicode NFKD diacritic folding,
// collapsing of repeated whitespace, and symbol/emoji-as-delimiter handling.
//
// Defined ONCE here and imported by BOTH the route and its test, so the demo a
// user clicks and the assertions that guard it can never drift apart.
export type SlugPreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The raw text the button loads into the input. */
	input: string;
};

export const SLUG_PRESETS: readonly SlugPreset[] = [
	{ label: 'Accented Latin', input: 'Héllo, World!' },
	{ label: 'Messy spacing', input: '  Multiple   Spaces  ' },
	{ label: 'Unicode + emoji', input: 'Ünïcode ✨ tëst' },
];
