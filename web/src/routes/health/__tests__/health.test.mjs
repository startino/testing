// Plain Response (not @sveltejs/kit's json()) lets us import the real GET handler
// here with no Vite/SvelteKit resolver, so this zero-dep node:test asserts its
// actual output contract -- status, exact body, content-type.

import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../+server.ts';

test('GET /health responds 200 with the static JSON body and json content-type', async () => {
	const res = GET();

	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { status: 'ok', app: 'testing' });
	assert.ok(res.headers.get('content-type').includes('application/json'));
});
