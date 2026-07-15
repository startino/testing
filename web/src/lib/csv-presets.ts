// Preset inputs for the /playground/csv demo. Each entry loads a distinct CSV
// shape into the parse demo: a plain grid, the RFC-4180 hard cases (a quoted
// field bearing the delimiter, doubled quotes, an embedded newline), a
// tab-separated grid, and a header-row table.
//
// Defined ONCE here and imported by BOTH the route and its test, so the demo a
// user clicks and the assertions that guard it can never drift apart -- the same
// discipline slugify-presets.ts and bytes-presets.ts follow.

/** A parse-direction preset: raw CSV text a button loads into the demo. */
export type CsvPreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The exact CSV text `parse` is asked to read. */
	input: string;
	/** The delimiter this preset is meant to be parsed with (default ","). */
	delimiter?: string;
	/** Whether this preset is meant to be parsed in header mode (default false). */
	header?: boolean;
};

// Each preset pairs its text with the delimiter / header mode it is designed for,
// so clicking it can set all three controls at once and the table renders as the
// author intended.
export const CSV_PRESETS: readonly CsvPreset[] = [
	{
		label: 'Simple grid',
		input: 'name,role,city\nAda,pioneer,London\nGrace,admiral,New York',
	},
	{
		label: 'Quoted delimiter',
		input: 'item,notes\n"apple, red",crisp\n"pear, green","sweet, soft"',
	},
	{
		label: 'Escaped quotes',
		input: 'quote,author\n"she said ""hi""",Ada\n"plain",Grace',
	},
	{
		label: 'Embedded newline',
		input: 'title,body\nmemo,"line one\nline two"\nnote,single',
	},
	{
		label: 'TSV (tab)',
		input: 'a\tb\tc\n1\t2\t3',
		delimiter: '\t',
	},
	{
		label: 'Header -> objects',
		input: 'id,email\n1,ada@x.dev\n2,grace@x.dev',
		header: true,
	},
];
