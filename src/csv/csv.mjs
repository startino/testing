// RFC-4180 CSV codec — pure, stateless, dependency-free.
//
// Runtime choice: Node.js v24+ with native ESM JavaScript (typed via JSDoc),
// matching the sibling modules src/bytes/, src/duration/, src/slug/, and
// src/flags/. Rationale: parsing and emitting the RFC-4180 grammar is a pure
// character walk with no external dependency — there is nothing to install and
// no build step. A single hand-written state machine does the parse; string
// concatenation with a minimal-quoting rule does the emit.
//
// Grammar (RFC 4180, https://www.rfc-editor.org/rfc/rfc4180):
//   - A CSV text is a series of RECORDS separated by a line break.
//   - Each record is a series of FIELDS separated by the `delimiter` (`,` by
//     default; configurable, e.g. `\t` for TSV).
//   - A field MAY be wrapped in double quotes. A field that contains the
//     delimiter, a double quote, or a line break MUST be quoted.
//   - Inside a quoted field a literal double quote is written as two double
//     quotes (`""`), and delimiters / line breaks are literal data.
//
// This module reads a permissive superset of that grammar and emits the strict
// canonical form, so the two directions compose into a round-trip law:
//
//   parse(stringify(rows)) deep-equals rows
//
// for any `rows` of string cells (see the honest statement of the law at the
// bottom of this header).
//
// Reader tolerances (a real-world CSV is rarely byte-perfect RFC-4180):
//   - Record separators: CRLF (`\r\n`, the RFC form), lone LF (`\n`, the Unix
//     form), and lone CR (`\r`, the classic-Mac form) are all accepted. Inside a
//     quoted field every one of them is literal data, never a separator.
//   - A trailing record separator at end-of-input does NOT synthesise an extra
//     empty record — `"a\n"` is one record `[["a"]]`, not two.
//   - A double quote is special ONLY at the start of a field; a quote appearing
//     mid-field in an unquoted field (`a"b`) is a literal character. This keeps
//     the reader total (it never rejects) without corrupting the canonical forms
//     the writer produces.
//   - Empty input (`""`) parses to `[]`.
//
// Writer canonical form:
//   - Records are joined by CRLF (`\r\n`); there is NO trailing separator, so a
//     re-parse yields exactly the record count that went in.
//   - A field is quoted IFF it contains the delimiter, a double quote, CR, or
//     LF; otherwise it is emitted bare. Internal double quotes are doubled. This
//     is MINIMAL quoting — `stringify([["a","b"]])` is `"a,b"`, not `'"a","b"'`.
//
// Fail-closed contract: neither function throws.
//   - `parse` returns `[]` for any non-string `text`, and for an invalid
//     `delimiter` (not a single character, or one of `"` / `\r` / `\n`). Every
//     string input otherwise parses (the reader is total).
//   - `stringify` returns `""` for a non-array `rows`, an empty `rows`, and for
//     an invalid `delimiter`. Cells are coerced with `String(...)` and a
//     null/undefined cell is treated as the empty field.
//
// Round-trip law (stated honestly): `parse(stringify(rows)) deep-equals rows`
// holds for every `rows` whose cells are strings — including cells that contain
// the delimiter, embedded quotes, and embedded CR/LF, which the writer quotes
// and the reader unwraps losslessly. Two honest boundaries:
//   - It is NOT promised for non-string cells: the writer coerces `42` to `"42"`
//     and the reader returns the string `"42"`, so a number round-trips to its
//     string form, not back to a number.
//   - It excludes the degenerate ALL-EMPTY-BOUNDARY case: a grid whose entire
//     serialisation is empty or is only record separators (e.g. `[[""]]` -> `""`,
//     `[[""],[""]]` -> `"\r\n"`) cannot round-trip, because an empty field at a
//     document boundary is indistinguishable from an empty document — the
//     inherent CSV ambiguity between "one empty field" and "no data". As soon as
//     any row carries a non-empty cell (or an internal empty field like
//     `["", "x"]`), the ambiguity is gone and the law holds.
// In `header` mode the law holds for an array of objects that share one key set,
// since the header row is derived from the first row's keys and every data row is
// written in that column order.

/** The one character double quotes are represented with in the grammar. */
const QUOTE = '"';

/** Canonical record separator the writer emits (RFC-4180 mandates CRLF). */
const CRLF = '\r\n';

/**
 * A delimiter is valid iff it is a single character that is not itself a quote
 * or a line-break character — otherwise it would be indistinguishable from the
 * grammar's own structural characters and the round-trip law would break.
 *
 * @param {unknown} delimiter the candidate field separator
 * @returns {boolean} true iff usable as a delimiter
 */
function isValidDelimiter(delimiter) {
  return (
    typeof delimiter === 'string' &&
    delimiter.length === 1 &&
    delimiter !== QUOTE &&
    delimiter !== '\r' &&
    delimiter !== '\n'
  );
}

/**
 * Parse CSV text into rows. In the default mode each row is an array of string
 * fields (`string[][]`); with `header: true` the first row is consumed as the
 * column names and every following row becomes a plain object keyed by them
 * (`Record<string, string>[]`).
 *
 * Pure and stateless. The reader is TOTAL for string input — it never throws and
 * never rejects a string; malformed-but-parseable shapes are resolved by the
 * documented tolerances (lone-CR/LF separators, mid-field quotes as literals,
 * trailing-separator suppression). Fail-closed only on a non-string `text` or an
 * invalid `delimiter`, both of which yield `[]`.
 *
 * @param {string} text the CSV document
 * @param {{ delimiter?: string, header?: boolean }} [opts]
 *   - `delimiter` (default `","`): the field separator; a single character other
 *     than `"`, `\r`, `\n`. An invalid delimiter fails closed to `[]`.
 *   - `header` (default `false`): when `true`, treat the first record as column
 *     names and return an array of objects instead of an array of arrays.
 * @returns {string[][] | Record<string, string>[]} the parsed rows (`[]` for
 *   empty or fail-closed input)
 */
export function parse(text, { delimiter = ',', header = false } = {}) {
  if (typeof text !== 'string' || text === '') return [];
  if (!isValidDelimiter(delimiter)) return [];

  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let record = [];
  let field = '';
  let inQuotes = false;
  // `dirty` tracks whether the current record has consumed ANY input (a field
  // char, an opening quote, or a field-terminating delimiter) since the last
  // record break. It is what distinguishes a real final record from a trailing
  // separator: at EOF we flush only when the record is dirty, so `"a\n"` does
  // not synthesise a phantom empty record.
  let dirty = false;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    rows.push(record);
    record = [];
    dirty = false;
  };

  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === QUOTE) {
        // A doubled quote inside quotes is one literal quote; a lone quote closes
        // the quoted region.
        if (text[i + 1] === QUOTE) {
          field += QUOTE;
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    // Outside quotes.
    if (c === QUOTE && field === '') {
      // A quote is special only at the very start of a field; elsewhere it is a
      // literal (handled by the `else` below).
      inQuotes = true;
      dirty = true;
    } else if (c === delimiter) {
      endField();
      dirty = true;
    } else if (c === '\r') {
      endRecord();
      // Consume the LF of a CRLF pair as part of the same separator.
      if (text[i + 1] === '\n') i += 1;
    } else if (c === '\n') {
      endRecord();
    } else {
      field += c;
      dirty = true;
    }
  }

  // Flush a pending final record only when it actually holds content — a text
  // ending in a record separator left `dirty` false and must not gain a record.
  if (dirty) endRecord();

  if (!header) return rows;

  // Header mode: the first record is the column names; each remaining record is
  // zipped against them into an object. A missing trailing cell fills as "".
  if (rows.length === 0) return [];
  const keys = rows[0];
  return rows.slice(1).map((row) => {
    /** @type {Record<string, string>} */
    const obj = {};
    for (let k = 0; k < keys.length; k++) obj[keys[k]] = row[k] ?? '';
    return obj;
  });
}

/**
 * Escape one field into its canonical RFC-4180 form: quoted (with internal
 * quotes doubled) IFF it contains the delimiter, a quote, or a line break;
 * otherwise emitted bare. `null`/`undefined` become the empty field; every other
 * value is coerced with `String(...)`.
 *
 * @param {unknown} value the raw cell value
 * @param {string} delimiter the active field separator
 * @returns {string} the escaped field
 */
function escapeField(value, delimiter) {
  const s = value === null || value === undefined ? '' : String(value);
  const mustQuote =
    s.includes(QUOTE) || s.includes(delimiter) || s.includes('\n') || s.includes('\r');
  if (!mustQuote) return s;
  return QUOTE + s.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE;
}

/**
 * Serialise rows into a canonical RFC-4180 CSV string — the inverse of `parse`.
 * In the default mode `rows` is an array of arrays of cells (`string[][]`); with
 * `header: true` `rows` is an array of objects, the column order is taken from
 * the first object's keys, a header record of those keys is emitted first, and
 * each object is written in that column order.
 *
 * Pure and stateless. Fail-closed: returns `""` — never throws — for a non-array
 * `rows`, an empty `rows`, or an invalid `delimiter`. Records are joined by CRLF
 * with no trailing separator, so `parse(stringify(rows))` yields exactly the
 * records that went in.
 *
 * @param {string[][] | Record<string, unknown>[]} rows the rows to serialise
 * @param {{ delimiter?: string, header?: boolean }} [opts]
 *   - `delimiter` (default `","`): the field separator; a single character other
 *     than `"`, `\r`, `\n`. An invalid delimiter fails closed to `""`.
 *   - `header` (default `false`): when `true`, treat `rows` as objects and emit a
 *     leading header record derived from the first object's keys.
 * @returns {string} the CSV document (`""` for empty or fail-closed input)
 */
export function stringify(rows, { delimiter = ',', header = false } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  if (!isValidDelimiter(delimiter)) return '';

  /** @type {string[]} */
  let records;
  if (header) {
    // Column set is the first row's own key order; every data row is projected
    // through it so the emitted grid is rectangular and column-stable.
    const keys = Object.keys(/** @type {Record<string, unknown>} */ (rows[0]));
    const headerLine = keys.map((k) => escapeField(k, delimiter)).join(delimiter);
    const body = rows.map((row) =>
      keys
        .map((k) => escapeField(/** @type {Record<string, unknown>} */ (row)[k], delimiter))
        .join(delimiter),
    );
    records = [headerLine, ...body];
  } else {
    records = rows.map((row) =>
      (Array.isArray(row) ? row : [row]).map((cell) => escapeField(cell, delimiter)).join(delimiter),
    );
  }

  return records.join(CRLF);
}
