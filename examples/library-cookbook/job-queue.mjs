import { parse, stringify } from '../../src/csv/csv.mjs';
import { formatDuration, parseDuration } from '../../src/duration/duration.mjs';
import { flow } from '../../src/pipe/pipe.mjs';
import { andThen, err, map, match, ok } from '../../src/result/result.mjs';

const input = `id,task,timeout\r\nA-17,Create invoice,1m 30s\r\nB-04,Send reminder,90s\r\nC-22,Archive report,45s`;

const requireFields = (row) =>
  row.id && row.task && row.timeout
    ? ok(row)
    : err({ id: row.id || '(missing)', message: 'A required field is empty.' });

const addTimeoutMilliseconds = (row) => {
  const timeoutMs = parseDuration(row.timeout);
  return timeoutMs === null
    ? err({ id: row.id, message: `Invalid duration string: ${row.timeout}` })
    : ok({ ...row, timeoutMs });
};

const normalizeTimeout = (row) => ({
  ...row,
  timeout: formatDuration(row.timeoutMs),
});

const processRow = flow(
  requireFields,
  (result) => andThen(result, addTimeoutMilliseconds),
  (result) => map(result, normalizeTimeout),
);

const rows = parse(input, { header: true });
const outcomes = rows.map(processRow);
const accepted = [];
const rejected = [];

for (const outcome of outcomes) {
  match(outcome, {
    ok: (row) => accepted.push(row),
    err: (failure) => rejected.push(failure),
  });
}

const output = stringify(accepted, { header: true });

console.log(output);
console.log(JSON.stringify(rejected));
