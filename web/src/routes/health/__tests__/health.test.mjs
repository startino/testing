// Co-located test for the /health liveness endpoint.
//
// Runner: Node's built-in `node:test` + `node:assert/strict` (zero deps), the
// same idiom as the src/* modules. Run from web/:  npm test  (alias for
// `node --test`). NOTE: `node --test <DIRECTORY>` fails on Node 24 with
// MODULE_NOT_FOUND -- use bare `node --test` (cwd auto-discovery of
// *.test.mjs) or an explicit file path, never a bare directory argument.
//
// The handler uses a plain Response (not @sveltejs/kit's json()), so it is
// importable here with no SvelteKit/vite resolver; this asserts the real
// handler's output contract -- status, exact body, and content-type.

import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../+server.ts';

test('GET /health responds 200 with the static JSON body and json content-type', async () => {
	const res = GET();

	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { status: 'ok', app: 'testing' });
	assert.ok(res.headers.get('content-type').includes('application/json'));
});
