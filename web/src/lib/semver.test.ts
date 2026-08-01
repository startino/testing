import { describe, it, expect } from 'vitest';
import { parse, compare, satisfies } from './semver.js';
// Import the canonical library and its fixtures DIRECTLY so this test proves the
// web adapter is the exact same implementation, not a look-alike copy.
import {
	parse as canonicalParse,
	compare as canonicalCompare,
	satisfies as canonicalSatisfies,
} from '../../../src/semver/semver.mjs';
import {
	VALID_PARSE,
	INVALID_PARSE,
	PRECEDENCE_CHAIN,
	COMPARE_CASES,
	SATISFIES_CASES,
	UNSUPPORTED_RANGES,
} from '../../../src/semver/fixtures.mjs';
import {
	SEMVER_PARSE_PRESETS,
	SEMVER_COMPARE_PRESETS,
	SEMVER_SATISFIES_PRESETS,
} from './semver-presets.js';

describe('semver (web adapter)', () => {
	it('parses strict SemVer 2.0.0 versions into their fields', () => {
		expect(parse('1.2.3')).toMatchObject({ major: 1, minor: 2, patch: 3 });
		// Numeric prerelease identifiers come back as NUMBERS and alphanumeric
		// ones as STRINGS -- the type IS the precedence classification.
		expect(parse('1.0.0-alpha.1')?.prerelease).toEqual(['alpha', 1]);
		// Build identifiers stay verbatim; they are never compared.
		expect(parse('1.0.0+001.a')?.build).toEqual(['001', 'a']);
	});

	it('orders versions by SemVer precedence', () => {
		expect(compare('1.2.3', '1.2.4')).toBe(-1);
		expect(compare('2.0.0', '10.0.0')).toBe(-1); // numeric, not lexicographic
		expect(compare('1.0.0-alpha', '1.0.0')).toBe(-1); // prerelease below its release
		expect(compare('1.2.3+a', '1.2.3+b')).toBe(0); // build metadata is ignored
	});

	it('tests versions against the supported caret / tilde / exact ranges', () => {
		expect(satisfies('1.9.0', '^1.2.3')).toBe(true);
		expect(satisfies('2.0.0', '^1.2.3')).toBe(false); // exclusive upper bound
		expect(satisfies('1.2.9', '~1.2.3')).toBe(true);
		expect(satisfies('1.2.3', '1.2.3')).toBe(true);
	});

	it('fails closed (null) on invalid parse input, never throwing', () => {
		expect(parse('v1.2.3')).toBeNull(); // npm strips the v; this library does not
		expect(parse(' 1.2.3')).toBeNull(); // there is NO trimming in the library
		expect(parse('1.2')).toBeNull();
		expect(parse('01.2.3')).toBeNull(); // leading zero in a core field
	});

	it('fails closed (null) on compare when either side is unreadable', () => {
		expect(compare('v1.2.3', '1.2.3')).toBeNull();
		expect(compare('1.2.3', '1.2')).toBeNull();
		expect(compare(null, '1.2.3')).toBeNull();
	});

	it('fails closed (false) on satisfies -- never null, never a throw', () => {
		// A boolean predicate has no third state to report "I could not tell",
		// so an unsupported range and a genuine mismatch both answer false.
		expect(satisfies('1.2.3', '>=1.2.3')).toBe(false);
		expect(satisfies('1.2.3', '1.2.x')).toBe(false);
		expect(satisfies('1.2.3', '*')).toBe(false);
		expect(satisfies('1.2.3', '^1.2.3 || ^2.0.0')).toBe(false);
		expect(satisfies('v1.2.3', '^1.2.3')).toBe(false);
	});
});

describe('semver web adapter == shipped src/semver library', () => {
	// The whole point of the route: the web app consumes the shipped module, not
	// a divergent copy. Assert agreement across every fixture case.
	it.each(VALID_PARSE)(
		'parses fixture: $name',
		({ input, major, minor, patch, prerelease, build }) => {
			const out = parse(input);
			expect(out).not.toBeNull();
			expect(out?.major).toBe(major);
			expect(out?.minor).toBe(minor);
			expect(out?.patch).toBe(patch);
			expect(out?.prerelease).toEqual(prerelease);
			expect(out?.build).toEqual(build);
			// The grammar admits one spelling per version, so parse round-trips.
			expect(out?.version).toBe(input);
			expect(out).toEqual(canonicalParse(input));
		}
	);

	it.each(INVALID_PARSE)('fails closed on fixture: $name', ({ input }) => {
		expect(parse(input)).toBeNull();
		expect(parse(input)).toBe(canonicalParse(input));
	});

	it('reproduces the SemVer 11 precedence chain, strictly ascending', () => {
		// Every earlier entry must compare lower than EVERY later one -- pairwise,
		// not just neighbour-to-neighbour, which is what proves transitivity.
		for (let i = 0; i < PRECEDENCE_CHAIN.length; i++) {
			for (let j = i + 1; j < PRECEDENCE_CHAIN.length; j++) {
				const lower = PRECEDENCE_CHAIN[i];
				const higher = PRECEDENCE_CHAIN[j];
				expect(compare(lower, higher)).toBe(-1);
				expect(compare(higher, lower)).toBe(1);
				expect(compare(lower, higher)).toBe(canonicalCompare(lower, higher));
			}
		}
	});

	it.each(COMPARE_CASES)('matches canonical compare on fixture: $name', ({ a, b, expected }) => {
		expect(compare(a, b)).toBe(expected);
		expect(compare(a, b)).toBe(canonicalCompare(a, b));
	});

	it.each(SATISFIES_CASES)(
		'matches canonical satisfies on fixture: $name',
		({ version, range, expected }) => {
			expect(satisfies(version, range)).toBe(expected);
			expect(satisfies(version, range)).toBe(canonicalSatisfies(version, range));
		}
	);

	it.each(UNSUPPORTED_RANGES)(
		'rejects unsupported range fixture: $name',
		({ version, range }) => {
			expect(satisfies(version, range)).toBe(false);
			expect(satisfies(version, range)).toBe(canonicalSatisfies(version, range));
		}
	);
});

describe('/playground/semver presets', () => {
	// These are the exact values the preset buttons load. The preview the user
	// sees is parse(input) / compare(a, b) / satisfies(version, range), so
	// asserting these outputs pins what the page renders for each preset.
	const parseExpected: Record<string, { major: number; minor: number; patch: number } | null> = {
		'1.2.3': { major: 1, minor: 2, patch: 3 },
		'1.0.0-alpha.1': { major: 1, minor: 0, patch: 0 },
		'1.0.0-beta.2+exp.sha.5114f85': { major: 1, minor: 0, patch: 0 },
		'1.0.0-0': { major: 1, minor: 0, patch: 0 },
		'v1.2.3': null,
		'01.2.3': null,
	};
	// The prerelease/build identifier lists the parse panel renders, keyed by the
	// same preset input. Pinned separately from the core tuple because the
	// identifier TYPING (number vs string) is the part the panel exists to show.
	const parseIdentifiers: Record<string, { prerelease: (string | number)[]; build: string[] }> = {
		'1.2.3': { prerelease: [], build: [] },
		'1.0.0-alpha.1': { prerelease: ['alpha', 1], build: [] },
		'1.0.0-beta.2+exp.sha.5114f85': {
			prerelease: ['beta', 2],
			build: ['exp', 'sha', '5114f85'],
		},
		'1.0.0-0': { prerelease: [0], build: [] },
	};
	const compareExpected: Record<string, -1 | 0 | 1 | null> = {
		'1.2.3|1.2.4': -1,
		'2.0.0|10.0.0': -1,
		'1.0.0-alpha|1.0.0': -1,
		'1.0.0-beta.2|1.0.0-beta.11': -1,
		'1.2.3+a|1.2.3+b': 0,
		'v1.2.3|1.2.3': null,
	};
	const satisfiesExpected: Record<string, boolean> = {
		'1.9.0|^1.2.3': true,
		'2.0.0|^1.2.3': false,
		'0.2.9|^0.2.3': true,
		'1.3.0|~1.2.3': false,
		'1.2.3|1.2.3': true,
		'1.2.4-alpha|^1.2.3': false,
		'1.2.3|>=1.2.3': false,
	};

	it('covers exactly the demo presets', () => {
		// Compare as sets so the assertion is not fragile against display order.
		expect(new Set(SEMVER_PARSE_PRESETS.map((p) => p.input))).toEqual(
			new Set(Object.keys(parseExpected))
		);
		expect(SEMVER_PARSE_PRESETS).toHaveLength(Object.keys(parseExpected).length);
		expect(new Set(SEMVER_COMPARE_PRESETS.map((p) => `${p.a}|${p.b}`))).toEqual(
			new Set(Object.keys(compareExpected))
		);
		expect(SEMVER_COMPARE_PRESETS).toHaveLength(Object.keys(compareExpected).length);
		expect(new Set(SEMVER_SATISFIES_PRESETS.map((p) => `${p.version}|${p.range}`))).toEqual(
			new Set(Object.keys(satisfiesExpected))
		);
		expect(SEMVER_SATISFIES_PRESETS).toHaveLength(Object.keys(satisfiesExpected).length);
	});

	it.each(SEMVER_PARSE_PRESETS)(
		'parse preset "$label" previews the right fields',
		({ input }) => {
			const out = parse(input);
			const expected = parseExpected[input];
			if (expected === null) {
				expect(out).toBeNull();
			} else {
				expect(out).toMatchObject(expected);
				expect(out?.prerelease).toEqual(parseIdentifiers[input].prerelease);
				expect(out?.build).toEqual(parseIdentifiers[input].build);
			}
			expect(out).toEqual(canonicalParse(input));
		}
	);

	it.each(SEMVER_COMPARE_PRESETS)(
		'compare preset "$label" previews the right relation',
		({ a, b }) => {
			expect(compare(a, b)).toBe(compareExpected[`${a}|${b}`]);
			expect(compare(a, b)).toBe(canonicalCompare(a, b));
		}
	);

	it.each(SEMVER_SATISFIES_PRESETS)(
		'satisfies preset "$label" previews the right result',
		({ version, range }) => {
			expect(satisfies(version, range)).toBe(satisfiesExpected[`${version}|${range}`]);
			expect(satisfies(version, range)).toBe(canonicalSatisfies(version, range));
		}
	);
});
