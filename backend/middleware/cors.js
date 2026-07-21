export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export function withCors(response) {
	const newResponse = new Response(response.body, response);
	for (const [key, value] of Object.entries(corsHeaders)) {
		newResponse.headers.set(key, value);
	}
	return newResponse;
}
