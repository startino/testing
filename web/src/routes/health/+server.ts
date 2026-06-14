// Override the root layout's `prerender = true`: a liveness probe must be served
// live by the running Node process, not baked to a static file at build time.
export const prerender = false;

export const GET = () =>
	new Response(JSON.stringify({ status: 'ok', app: 'testing' }), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
