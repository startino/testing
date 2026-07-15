import { describe, it, expect } from 'vitest';
import { parse, stringify } from './csv.js';
// Import the canonical library and its fixtures DIRECTLY so this test proves the
// web adapter is the exact same implementation, not a look-alike copy.
import { parse as canonicalParse, stringify as canonicalStringify } from '../../../src/csv/csv.mjs';
import { PARSE_CASES, STRINGIFY_CASES, ROUND_TRIP } from '../../../src/csv/fixtures.mjs';
import { CSV_PRESETS } from './csv-presets.js';

describe('csv (web adapter)', () => {
	it('parses CSV into rows of string fields', () => {
		expect(parse('a,b,c\r\n1,2,3')).toEqual([
			['a', 'b', 'c'],
			['1', '2', '3'],
		]);
		expect(parse('"a,b",c')).toEqual([['a,b', 'c']]);
	});

	it('parses header mode into objects', () => {
		expect(parse('name,age\r\nAda,36', { header: true })).toEqual([{ name: 'Ada', age: '36' }]);
	});

	it('stringifies rows with minimal quoting', () => {
		expect(stringify([['a', 'b']])).toBe('a,b');
		expect(stringify([['a,b', 'c']])).toBe('"a,b",c');
	});

	it('fails closed (never throws) on bad input', () => {
		expect(parse(null as unknown as string)).toEqual([]);
		expect(stringify(null as unknown as string[][])).toBe('');
	});
});

describe('csv web adapter == shipped src/csv library', () => {
	// The whole point of the route: the web app consumes the shipped module, not
	// a divergent copy. Assert byte-for-byte agreement across every fixture case.
	it.each(PARSE_CASES)(
		'matches canonical parse on fixture: $name',
		({ input, opts, expected }) => {
			expect(parse(input as string, opts)).toEqual(expected);
			expect(parse(input as string, opts)).toEqual(canonicalParse(input, opts));
		}
	);

	it.each(STRINGIFY_CASES)(
		'matches canonical stringify on fixture: $name',
		({ rows, opts, expected }) => {
			expect(stringify(rows as string[][], opts)).toBe(expected);
			expect(stringify(rows as string[][], opts)).toBe(
				canonicalStringify(rows as string[][], opts)
			);
		}
	);

	it.each(ROUND_TRIP)('round-trips fixture through the adapter: $name', ({ rows, opts }) => {
		expect(parse(stringify(rows as string[][], opts), opts)).toEqual(rows);
	});
});

describe('/playground/csv presets', () => {
	// Every preset must parse without throwing under its intended delimiter/header
	// mode and yield at least one row -- this pins that the demo renders a table
	// for each preset button, not an empty or thrown result.
	it.each(CSV_PRESETS)('preset "$label" parses to a non-empty table', (preset) => {
		const rows = parse(preset.input, { delimiter: preset.delimiter, header: preset.header });
		expect(Array.isArray(rows)).toBe(true);
		expect(rows.length).toBeGreaterThan(0);
		// and the adapter agrees byte-for-byte with the shipped library
		expect(rows).toEqual(
			canonicalParse(preset.input, { delimiter: preset.delimiter, header: preset.header })
		);
	});
});
