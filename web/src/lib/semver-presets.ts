// Preset inputs for the /playground/semver demo, one set per panel of the
// shipped SemVer library. Each entry exercises a distinct facet: the plain
// release, a prerelease whose identifiers are typed apart (text vs number),
// build metadata that is carried verbatim yet never compared, the two spellings
// the strict grammar rejects, the precedence rules that are easy to get wrong
// (numeric-not-lexicographic, prerelease-below-release), and the caret/tilde
// range boundary that separates the supported subset from everything else.
//
// Defined ONCE here and imported by BOTH the route and its test, so the demo a
// user clicks and the assertions that guard it can never drift apart -- the
// same discipline duration-presets.ts follows.

/** A parse-panel preset: a version string the button loads into the demo. */
export type SemverParsePreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The raw string `parse` is asked to accept (or fail closed on). */
	input: string;
};

/** A compare-panel preset: the two version strings the button loads. */
export type SemverComparePreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The left-hand version string handed to `compare`. */
	a: string;
	/** The right-hand version string handed to `compare`. */
	b: string;
};

/** A satisfies-panel preset: the version and range the button loads. */
export type SemverSatisfiesPreset = {
	/** Human label shown on the preset button. */
	label: string;
	/** The version string under test. */
	version: string;
	/** The range it is tested against, in the supported `1.2.3` / `^` / `~` subset. */
	range: string;
};

// Parse panel: version string -> fields. The first four are inside the strict
// grammar and pin what the parsed view renders -- a plain release, a prerelease
// whose identifiers split into text ("alpha") and number (1), build metadata
// kept verbatim beside a prerelease, and the numeric zero identifier. The last
// two are the classic near-misses that fail closed: the "v" prefix npm strips
// but this library rejects, and a leading zero in a core field.
export const SEMVER_PARSE_PRESETS: readonly SemverParsePreset[] = [
	{ label: 'Plain release', input: '1.2.3' },
	{ label: 'Prerelease', input: '1.0.0-alpha.1' },
	{ label: 'Build metadata', input: '1.0.0-beta.2+exp.sha.5114f85' },
	{ label: 'Numeric zero id', input: '1.0.0-0' },
	{ label: 'v1.2.3 (rejected)', input: 'v1.2.3' },
	{ label: '01.2.3 (rejected)', input: '01.2.3' },
];

// Compare panel: two version strings -> -1 | 0 | 1 | null. Covers the ordering
// rules a hand-rolled comparator usually gets wrong -- core fields compare
// NUMERICALLY (2.0.0 < 10.0.0, not the other way round), a prerelease sorts
// BELOW its own release, numeric prerelease identifiers compare as numbers
// (beta.2 < beta.11), and build metadata is excluded from precedence entirely so
// the pair compares EQUAL. The last entry is the fail-closed null: one side is
// unparseable, so no ordering is guessed.
export const SEMVER_COMPARE_PRESETS: readonly SemverComparePreset[] = [
	{ label: 'Patch order', a: '1.2.3', b: '1.2.4' },
	{ label: 'Numeric, not text', a: '2.0.0', b: '10.0.0' },
	{ label: 'Prerelease < release', a: '1.0.0-alpha', b: '1.0.0' },
	{ label: 'beta.2 < beta.11', a: '1.0.0-beta.2', b: '1.0.0-beta.11' },
	{ label: 'Build ignored (equal)', a: '1.2.3+a', b: '1.2.3+b' },
	{ label: 'v prefix (fail-closed)', a: 'v1.2.3', b: '1.2.3' },
];

// Satisfies panel: version + range -> boolean. Walks the whole supported subset
// and its edges -- a caret hit and its exclusive upper bound, the 0.x tier where
// caret narrows to the minor, the tilde bound that differs from caret, an exact
// match, the prerelease gate (a prerelease of a LATER core is never pulled into
// a release-only range), and finally a ">=" comparator, which is outside the
// grammar and so answers false rather than reporting "I did not understand you".
export const SEMVER_SATISFIES_PRESETS: readonly SemverSatisfiesPreset[] = [
	{ label: 'Caret: inside', version: '1.9.0', range: '^1.2.3' },
	{ label: 'Caret: upper bound', version: '2.0.0', range: '^1.2.3' },
	{ label: 'Caret 0.x tier', version: '0.2.9', range: '^0.2.3' },
	{ label: 'Tilde: upper bound', version: '1.3.0', range: '~1.2.3' },
	{ label: 'Exact match', version: '1.2.3', range: '1.2.3' },
	{ label: 'Prerelease gate', version: '1.2.4-alpha', range: '^1.2.3' },
	{ label: '>= (unsupported)', version: '1.2.3', range: '>=1.2.3' },
];
