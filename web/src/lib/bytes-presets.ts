// Preset inputs for the /playground/bytes demo, one set per direction of the
// shipped bytes library. Each entry exercises a distinct facet: exact unit
// multiples, a fractional magnitude, the "0 B" floor, a lossy off-grid render,
// and (for parsing) non-canonical spellings the strict inverse rejects.
//
// Defined ONCE here and imported by BOTH the route and its test, so the demo a
// user clicks and the assertions that guard it can never drift apart -- the
// same discipline slugify-presets.ts follows.

/** A format-direction preset: a raw byte count the button loads into the demo. */
export type BytesFormatPreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The exact byte count `formatBytes` is asked to render. */
	bytes: number;
};

/** A parse-direction preset: an IEC string the button loads into the demo. */
export type BytesParsePreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The raw string `parseBytes` is asked to accept (or fail closed on). */
	input: string;
};

// Format direction: byte counts -> canonical IEC strings. Includes 0 (the "0 B"
// floor), an exact unit multiple, a half-unit fraction, an exact MiB, a lossy
// off-grid value (1234567 -> "1.2 MiB"), and a multi-GiB magnitude.
export const BYTES_FORMAT_PRESETS: readonly BytesFormatPreset[] = [
	{ label: 'Zero', bytes: 0 },
	{ label: 'Exact KiB', bytes: 1024 },
	{ label: 'Half KiB', bytes: 1536 },
	{ label: 'One MiB', bytes: 1048576 },
	{ label: 'Off-grid (lossy)', bytes: 1234567 },
	{ label: 'Five GiB', bytes: 5368709120 },
];

// Parse direction: strings -> byte counts. The first three are canonical and
// round-trip; the last two are meaningful but NON-canonical and fail closed to
// null -- "2048 KiB" (canonical "2 MiB") and "1 KB" (wrong, SI-style unit).
export const BYTES_PARSE_PRESETS: readonly BytesParsePreset[] = [
	{ label: '1 KiB', input: '1 KiB' },
	{ label: '1.5 KiB', input: '1.5 KiB' },
	{ label: '0 B', input: '0 B' },
	{ label: '2048 KiB (rejected)', input: '2048 KiB' },
	{ label: '1 KB (rejected)', input: '1 KB' },
];
