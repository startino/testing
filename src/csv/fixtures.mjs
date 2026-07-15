// Runtime: Node.js v24+ (ESM). Pure stdlib, zero runtime dependencies.
//
// Single source of truth for the CSV codec test cases. Each case is defined ONCE
// here and imported by the test suite — no copy-paste of inputs/expectations in
// the test file. The tables are split by the law each one proves:
//
//   PARSE_CASES     — reader behaviour: a CSV string -> rows. Covers the RFC-4180
//                     essentials (quoted delimiters, doubled quotes, embedded
//                     CR/LF), the reader tolerances (lone-CR/LF separators,
//                     trailing-separator suppression, empty input), custom
//                     delimiters (TSV), and header mode.
//   STRINGIFY_CASES — writer behaviour: rows -> a canonical CSV string. Covers
//                     minimal quoting (only-when-required), quote doubling,
//                     CRLF record joins with no trailing separator, and header
//                     mode.
//   ROUND_TRIP      — the composition law parse(stringify(rows)) deep-equals
//                     rows, over string-celled rows including every value that
//                     forces quoting, plus a header-mode object round-trip.
//   BAD_PARSE       — inputs `parse` must fail closed on ([]).
//   BAD_STRINGIFY   — inputs `stringify` must fail closed on ("").

/**
 * Reader cases. `input` is the raw CSV text; `expected` is the parsed result
 * (`string[][]`, or `object[]` when `opts.header` is set). `opts` is omitted for
 * the default comma / no-header configuration.
 *
 * @type {ReadonlyArray<{ name: string, input: string, opts?: object, expected: unknown }>}
 */
export const PARSE_CASES = Object.freeze([
  // --- RFC-4180 essentials ---
  {
    name: 'simple rows and fields',
    input: 'a,b,c\r\n1,2,3',
    expected: [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ],
  },
  {
    name: 'quoted field containing the delimiter',
    input: '"a,b",c',
    expected: [['a,b', 'c']],
  },
  {
    name: 'embedded double-quotes escaped by doubling',
    input: '"she said ""hi"""',
    expected: [['she said "hi"']],
  },
  {
    name: 'embedded newline (LF) inside a quoted field',
    input: '"line1\nline2",tail',
    expected: [['line1\nline2', 'tail']],
  },
  {
    name: 'embedded newline (CRLF) inside a quoted field',
    input: '"line1\r\nline2",tail',
    expected: [['line1\r\nline2', 'tail']],
  },
  {
    name: 'quoted empty field',
    input: '""',
    expected: [['']],
  },
  {
    name: 'empty trailing field',
    input: 'a,',
    expected: [['a', '']],
  },
  {
    name: 'a bare empty field between delimiters',
    input: 'a,,c',
    expected: [['a', '', 'c']],
  },
  // --- reader tolerances ---
  {
    name: 'empty input parses to no rows',
    input: '',
    expected: [],
  },
  {
    name: 'trailing LF does not add an empty record',
    input: 'a\n',
    expected: [['a']],
  },
  {
    name: 'trailing CRLF does not add an empty record',
    input: 'a,b\r\n',
    expected: [['a', 'b']],
  },
  {
    name: 'lone LF record separators (Unix)',
    input: 'a\nb\nc',
    expected: [['a'], ['b'], ['c']],
  },
  {
    name: 'lone CR record separators (classic Mac)',
    input: 'a\rb\rc',
    expected: [['a'], ['b'], ['c']],
  },
  {
    name: 'a quote mid-unquoted-field is a literal character',
    input: 'a"b,c',
    expected: [['a"b', 'c']],
  },
  // --- custom delimiter (TSV) ---
  {
    name: 'tab delimiter (TSV)',
    input: 'a\tb\tc',
    opts: { delimiter: '\t' },
    expected: [['a', 'b', 'c']],
  },
  {
    name: 'comma is a literal when the delimiter is a tab',
    input: 'a,b\tc',
    opts: { delimiter: '\t' },
    expected: [['a,b', 'c']],
  },
  // --- header mode ---
  {
    name: 'header mode maps records to objects',
    input: 'name,age\r\nAda,36\r\nGrace,45',
    opts: { header: true },
    expected: [
      { name: 'Ada', age: '36' },
      { name: 'Grace', age: '45' },
    ],
  },
  {
    name: 'header mode with only a header row yields no data objects',
    input: 'name,age',
    opts: { header: true },
    expected: [],
  },
  {
    name: 'header mode fills a missing trailing cell with empty string',
    input: 'a,b,c\r\n1,2',
    opts: { header: true },
    expected: [{ a: '1', b: '2', c: '' }],
  },
]);

/**
 * Writer cases. `rows` is the input (`string[][]`, or `object[]` under
 * `opts.header`); `expected` is the exact canonical CSV string.
 *
 * @type {ReadonlyArray<{ name: string, rows: unknown, opts?: object, expected: string }>}
 */
export const STRINGIFY_CASES = Object.freeze([
  {
    name: 'plain fields are emitted bare (minimal quoting)',
    rows: [
      ['a', 'b'],
      ['c', 'd'],
    ],
    expected: 'a,b\r\nc,d',
  },
  {
    name: 'a field containing the delimiter is quoted',
    rows: [['a,b', 'c']],
    expected: '"a,b",c',
  },
  {
    name: 'a field containing a quote is quoted and its quotes doubled',
    rows: [['she said "hi"']],
    expected: '"she said ""hi"""',
  },
  {
    name: 'a field containing a newline is quoted',
    rows: [['line1\nline2', 'tail']],
    expected: '"line1\nline2",tail',
  },
  {
    name: 'records are joined by CRLF with no trailing separator',
    rows: [['1'], ['2'], ['3']],
    expected: '1\r\n2\r\n3',
  },
  {
    name: 'empty cells are emitted as empty fields',
    rows: [['a', '', 'c']],
    expected: 'a,,c',
  },
  {
    name: 'tab delimiter (TSV) output',
    rows: [['a', 'b', 'c']],
    opts: { delimiter: '\t' },
    expected: 'a\tb\tc',
  },
  {
    name: 'header mode emits a leading header record from the first object keys',
    rows: [
      { name: 'Ada', age: '36' },
      { name: 'Grace', age: '45' },
    ],
    opts: { header: true },
    expected: 'name,age\r\nAda,36\r\nGrace,45',
  },
]);

/**
 * Round-trip cases: `parse(stringify(rows, opts), opts)` must deep-equal `rows`.
 * Every string-celled shape survives, including cells that force quoting.
 *
 * @type {ReadonlyArray<{ name: string, rows: unknown, opts?: object }>}
 */
export const ROUND_TRIP = Object.freeze([
  {
    name: 'plain grid',
    rows: [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ],
  },
  {
    name: 'cells with delimiters, quotes, and newlines',
    rows: [
      ['a,b', 'she said "hi"'],
      ['line1\nline2', 'plain'],
      ['', 'trailing-empty'],
    ],
  },
  {
    name: 'a leading empty cell survives (row is not all-empty)',
    rows: [['', 'x']],
  },
  {
    name: 'tab-delimited grid',
    rows: [
      ['a', 'b'],
      ['c,d', 'e\tf'],
    ],
    opts: { delimiter: '\t' },
  },
  {
    name: 'header-mode object rows',
    rows: [
      { name: 'Ada', note: 'says "hi"' },
      { name: 'Grace', note: 'multi\nline' },
    ],
    opts: { header: true },
  },
]);

/**
 * Inputs `parse` must fail closed on, returning `[]` and never throwing.
 *
 * @type {ReadonlyArray<{ name: string, input: unknown, opts?: object }>}
 */
export const BAD_PARSE = Object.freeze([
  { name: 'non-string: null', input: null },
  { name: 'non-string: undefined', input: undefined },
  { name: 'non-string: number', input: 42 },
  { name: 'non-string: array', input: [['a']] },
  { name: 'non-string: object', input: {} },
  { name: 'invalid delimiter: empty string', input: 'a,b', opts: { delimiter: '' } },
  { name: 'invalid delimiter: multi-char', input: 'a,b', opts: { delimiter: ',,' } },
  { name: 'invalid delimiter: the quote char', input: 'a,b', opts: { delimiter: '"' } },
  { name: 'invalid delimiter: newline', input: 'a,b', opts: { delimiter: '\n' } },
]);

/**
 * Inputs `stringify` must fail closed on, returning `""` and never throwing.
 *
 * @type {ReadonlyArray<{ name: string, rows: unknown, opts?: object }>}
 */
export const BAD_STRINGIFY = Object.freeze([
  { name: 'non-array: null', rows: null },
  { name: 'non-array: undefined', rows: undefined },
  { name: 'non-array: string', rows: 'a,b' },
  { name: 'non-array: number', rows: 42 },
  { name: 'empty array', rows: [] },
  { name: 'invalid delimiter: multi-char', rows: [['a', 'b']], opts: { delimiter: '::' } },
  { name: 'invalid delimiter: the quote char', rows: [['a', 'b']], opts: { delimiter: '"' } },
]);
