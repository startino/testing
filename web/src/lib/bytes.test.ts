import { describe, it, expect } from 'vitest';
import { formatBytes, parseBytes } from './bytes.js';
// Import the canonical library and its fixtures DIRECTLY so this test proves the
// web adapter is the exact same implementation, not a look-alike copy.
import {
	formatBytes as canonicalFormat,
	parseBytes as canonicalParse,
} from '../../../src/bytes/index.mjs';
import { ROUND_TRIP, FORMAT_CASES } from '../../../src/bytes/fixtures.mjs';
import { BYTES_FORMAT_PRESETS, BYTES_PARSE_PRESETS } from './bytes-presets.js';

describe('bytes (web adapter)', () => {
	it('formats byte counts as IEC sizes', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(1024)).toBe('1 KiB');
		expect(formatBytes(1536)).toBe('1.5 KiB');
	});

	it('parses canonical IEC strings back to byte counts', () => {
		expect(parseBytes('1 KiB')).toBe(1024);
		expect(parseBytes('1.5 KiB')).toBe(1536);
		expect(parseBytes('0 B')).toBe(0);
	});

	it('fails closed (null) on invalid format input, never throwing', () => {
		expect(formatBytes(-1)).toBeNull();
		expect(formatBytes(1.5)).toBeNull();
		expect(formatBytes(Number.NaN)).toBeNull();
	});

	it('fails closed (null) on non-canonical parse input, never throwing', () => {
		expect(parseBytes('2048 KiB')).toBeNull(); // canonical form is "2 MiB"
		expect(parseBytes('1 KB')).toBeNull(); // SI-style unit, not IEC
		expect(parseBytes('garbage')).toBeNull();
	});
});

describe('bytes web adapter == shipped src/bytes library', () => {
	// The whole point of the route: the web app consumes the shipped module, not
	// a divergent copy. Assert byte-for-byte agreement across every fixture case.
	it.each(ROUND_TRIP)('round-trips fixture: $name', ({ n, str }) => {
		expect(formatBytes(n)).toBe(str);
		expect(formatBytes(n)).toBe(canonicalFormat(n));
		expect(parseBytes(str)).toBe(n);
		expect(parseBytes(str)).toBe(canonicalParse(str));
	});

	it.each(FORMAT_CASES)('matches canonical format on fixture: $name', ({ n, str }) => {
		expect(formatBytes(n)).toBe(str);
		expect(formatBytes(n)).toBe(canonicalFormat(n));
	});
});

describe('/playground/bytes presets', () => {
	// These are the exact values the preset buttons load. The preview the user
	// sees is formatBytes(bytes) / parseBytes(input), so asserting these outputs
	// pins what the page renders for each preset.
	const formatExpected: Record<number, string> = {
		0: '0 B',
		1024: '1 KiB',
		1536: '1.5 KiB',
		1048576: '1 MiB',
		1234567: '1.2 MiB',
		5368709120: '5 GiB',
	};
	const parseExpected: Record<string, number | null> = {
		'1 KiB': 1024,
		'1.5 KiB': 1536,
		'0 B': 0,
		'2048 KiB': null,
		'1 KB': null,
	};

	it('covers exactly the demo presets', () => {
		// Compare as sets: Object.keys reorders integer-like keys ascending, so an
		// ordered compare would be fragile against the preset display order.
		expect(new Set(BYTES_FORMAT_PRESETS.map((p) => p.bytes))).toEqual(
			new Set(Object.keys(formatExpected).map(Number))
		);
		expect(BYTES_FORMAT_PRESETS).toHaveLength(Object.keys(formatExpected).length);
		expect(new Set(BYTES_PARSE_PRESETS.map((p) => p.input))).toEqual(
			new Set(Object.keys(parseExpected))
		);
		expect(BYTES_PARSE_PRESETS).toHaveLength(Object.keys(parseExpected).length);
	});

	it.each(BYTES_FORMAT_PRESETS)('format preset "$label" previews the right size', ({ bytes }) => {
		expect(formatBytes(bytes)).toBe(formatExpected[bytes]);
		expect(formatBytes(bytes)).toBe(canonicalFormat(bytes));
	});

	it.each(BYTES_PARSE_PRESETS)('parse preset "$label" previews the right result', ({ input }) => {
		expect(parseBytes(input)).toBe(parseExpected[input]);
		expect(parseBytes(input)).toBe(canonicalParse(input));
	});
});
