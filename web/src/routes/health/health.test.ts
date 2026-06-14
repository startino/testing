// The GET handler returns a plain Response (not @sveltejs/kit's json()), so it
// imports here with no Vite/SvelteKit resolver and we can assert its actual
// output contract: status, exact body, content-type.
import { describe, it, expect } from 'vitest';
import { GET } from './+server.js';

describe('GET /health', () => {
	it('responds 200 with the static JSON body and json content-type', async () => {
		const res = GET();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: 'ok', app: 'testing' });
		expect(res.headers.get('content-type')).toContain('application/json');
	});
});
