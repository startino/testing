# Library Cookbook

These recipes combine the small libraries in `src/`. Each example uses only
Node.js and public library exports. Run the examples from the repository root
with Node.js 24 or later.

## Validate a CSV job queue

Use this workflow when a CSV file contains jobs with strict duration strings.
The workflow parses each row, validates its duration, and writes accepted rows
to canonical CSV. It also returns rejected rows without exceptions.

The example combines these APIs:

- `parse` and `stringify` read and write the CSV document.
- `flow` creates the row-processing sequence.
- `ok`, `err`, `andThen`, `map`, and `match` keep both outcomes explicit.
- `parseDuration` validates each duration string.
- `formatDuration` creates a normalized duration string.

Run the example:

```sh
node examples/library-cookbook/job-queue.mjs
```

The command prints one accepted-job CSV document. It then prints one rejected
row with its validation message.

This pattern is useful at an import boundary. Keep the input as strings until
validation succeeds. Use `Result` values to keep bad rows separate from valid
rows.

## Retry a request and cache its result

Use this workflow when a remote request can fail for a short time. The workflow
retries only temporary failures and adds successful responses to an LRU cache.
The cache avoids a second remote request for the same key.

The example combines these APIs:

- `retry` controls attempts and backoff.
- `createLRU` stores successful responses with a capacity and a TTL.
- `ok`, `err`, and `match` expose the final request outcome.
- `pipe` and `tap` transform and observe successful data.
- `formatDuration` gives the retry delay a duration string.

Run the example:

```sh
node examples/library-cookbook/cached-retry.ts
```

The command uses an injected sleep function. Therefore, it completes without
a real delay or a network request. The output shows three request attempts and
one cache hit.

Use the default `sleep` and `random` functions in production. Inject these
functions when a caller needs deterministic behavior. Add values to the cache
only after `retry` returns successfully.

## API boundaries

`parseDuration` accepts only a duration string that `formatDuration` can emit.
For example, it rejects `90s` and accepts `1m 30s`.

`fromThrowable` supports synchronous functions. Do not use it to catch a
rejected promise. Use `try` and `catch` around asynchronous work, as the cached
retry example does.

`createLRU().get()` changes the recency order. Use `peek()` when a read must not
change that order. The examples use `get()` because a cache hit is active use.

`retry` throws the last request error when it stops. It does not wrap that
error. The example converts this final error to an `Err` value at the workflow
boundary.
