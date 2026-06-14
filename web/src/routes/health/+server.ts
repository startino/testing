export const prerender = true;

export const GET = () =>
	new Response(JSON.stringify({ status: 'ok', app: 'testing' }), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
