import { describe, it, expect } from 'vitest';
import { formatDuration, parseDuration } from './duration.js';
// Import the canonical library and its fixtures DIRECTLY so this test proves the
// web adapter is the exact same implementation, not a look-alike copy.
import {
	formatDuration as canonicalFormat,
	parseDuration as canonicalParse,
} from '../../../src/duration/duration.mjs';
import { ROUND_TRIP, FORMAT_CASES } from '../../../src/duration/fixtures.mjs';
import { DURATION_FORMAT_PRESETS, DURATION_PARSE_PRESETS } from './duration-presets.js';

describe('duration (web adapter)', () => {
	it('formats milliseconds as compact durations', () => {
		expect(formatDuration(0)).toBe('0s');
		expect(formatDuration(1500)).toBe('1.5s');
		expect(formatDuration(90000)).toBe('1m 30s');
	});

	it('parses canonical duration strings back to milliseconds', () => {
		expect(parseDuration('1m 30s')).toBe(90000);
		expect(parseDuration('1h 1m 1s')).toBe(3661000);
		expect(parseDuration('0s')).toBe(0);
	});

	it('fails closed (null) on invalid format input, never throwing', () => {
		expect(formatDuration(-1)).toBeNull();
		expect(formatDuration(1.5)).toBeNull();
		expect(formatDuration(Number.NaN)).toBeNull();
	});

	it('fails closed (null) on off-grammar parse input, never throwing', () => {
		expect(parseDuration('1m30s')).toBeNull(); // missing the single-space join
		expect(parseDuration('90s')).toBeNull(); // seconds that should have carried
		expect(parseDuration('2 mins')).toBeNull();
	});
});

describe('duration web adapter == shipped src/duration library', () => {
	// The whole point of the route: the web app consumes the shipped module, not
	// a divergent copy. Assert agreement across every fixture case.
	it.each(ROUND_TRIP)('round-trips fixture: $name', ({ ms, str }) => {
		expect(formatDuration(ms)).toBe(str);
		expect(formatDuration(ms)).toBe(canonicalFormat(ms));
		expect(parseDuration(str)).toBe(ms);
		expect(parseDuration(str)).toBe(canonicalParse(str));
	});

	it.each(FORMAT_CASES)('matches canonical format on fixture: $name', ({ ms, str }) => {
		expect(formatDuration(ms)).toBe(str);
		expect(formatDuration(ms)).toBe(canonicalFormat(ms));
	});
});

describe('/playground/duration presets', () => {
	// These are the exact values the preset buttons load. The preview the user
	// sees is formatDuration(ms) / parseDuration(input), so asserting these
	// outputs pins what the page renders for each preset.
	const formatExpected: Record<number, string> = {
		0: '0s',
		1500: '1.5s',
		90000: '1m 30s',
		3661000: '1h 1m 1s',
		90061000: '1d 1h 1m 1s',
		1250: '1.3s',
	};
	const parseExpected: Record<string, number | null> = {
		'1m 30s': 90000,
		'1h 1m 1s': 3661000,
		'0s': 0,
		'1m30s': null,
		'90s': null,
	};

	it('covers exactly the demo presets', () => {
		// Compare as sets: Object.keys reorders integer-like keys ascending, so an
		// ordered compare would be fragile against the preset display order.
		expect(new Set(DURATION_FORMAT_PRESETS.map((p) => p.ms))).toEqual(
			new Set(Object.keys(formatExpected).map(Number))
		);
		expect(DURATION_FORMAT_PRESETS).toHaveLength(Object.keys(formatExpected).length);
		expect(new Set(DURATION_PARSE_PRESETS.map((p) => p.input))).toEqual(
			new Set(Object.keys(parseExpected))
		);
		expect(DURATION_PARSE_PRESETS).toHaveLength(Object.keys(parseExpected).length);
	});

	it.each(DURATION_FORMAT_PRESETS)(
		'format preset "$label" previews the right string',
		({ ms }) => {
			expect(formatDuration(ms)).toBe(formatExpected[ms]);
			expect(formatDuration(ms)).toBe(canonicalFormat(ms));
		}
	);

	it.each(DURATION_PARSE_PRESETS)(
		'parse preset "$label" previews the right result',
		({ input }) => {
			expect(parseDuration(input)).toBe(parseExpected[input]);
			expect(parseDuration(input)).toBe(canonicalParse(input));
		}
	);
});
