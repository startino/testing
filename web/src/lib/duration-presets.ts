// Preset inputs for the /playground/duration demo, one set per direction of the
// shipped duration library. Each entry exercises a distinct facet: the "0s"
// floor, a sub-second fraction, unit carrying (90000 ms -> "1m 30s"), a
// full d/h/m/s spread, a lossy off-grid render, and (for parsing) strings the
// strict inverse rejects.
//
// Defined ONCE here and imported by BOTH the route and its test, so the demo a
// user clicks and the assertions that guard it can never drift apart -- the
// same discipline slugify-presets.ts follows.

/** A format-direction preset: a millisecond count the button loads into the demo. */
export type DurationFormatPreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The exact millisecond count `formatDuration` is asked to render. */
	ms: number;
};

/** A parse-direction preset: a duration string the button loads into the demo. */
export type DurationParsePreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The raw string `parseDuration` is asked to accept (or fail closed on). */
	input: string;
};

// Format direction: milliseconds -> compact duration strings. Includes 0 (the
// "0s" floor), a half-second (1500 -> "1.5s"), a minute+seconds carry
// (90000 -> "1m 30s"), a full h/m/s spread, a day-spanning total, and a lossy
// off-grid value (1250 -> "1.3s").
export const DURATION_FORMAT_PRESETS: readonly DurationFormatPreset[] = [
	{ label: 'Zero', ms: 0 },
	{ label: 'Half second', ms: 1500 },
	{ label: 'Minute + seconds', ms: 90000 },
	{ label: 'Hours spread', ms: 3661000 },
	{ label: 'Over a day', ms: 90061000 },
	{ label: 'Off-grid (lossy)', ms: 1250 },
];

// Parse direction: strings -> milliseconds. The first three are canonical and
// round-trip; the last two are meaningful but OUTSIDE the strict grammar and
// fail closed to null -- "1m30s" (missing the single-space join) and "90s"
// (seconds that should have carried into "1m 30s").
export const DURATION_PARSE_PRESETS: readonly DurationParsePreset[] = [
	{ label: '1m 30s', input: '1m 30s' },
	{ label: '1h 1m 1s', input: '1h 1m 1s' },
	{ label: '0s', input: '0s' },
	{ label: '1m30s (rejected)', input: '1m30s' },
	{ label: '90s (rejected)', input: '90s' },
];
