const CACHE_KEY = "filters:options";
const CACHE_TTL_SECONDS = 3600;

export async function listFilters(request, env) {
	const cached = await env.CACHE.get(CACHE_KEY, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const [habitats, diets, statuses] = await Promise.all([
		env.DB.prepare("SELECT DISTINCT habitat FROM SPECIES ORDER BY habitat").all(),
		env.DB.prepare("SELECT DISTINCT diet FROM SPECIES ORDER BY diet").all(),
		env.DB.prepare("SELECT DISTINCT conservation_status FROM SPECIES ORDER BY conservation_status").all(),
	]);

	const payload = {
		habitats: habitats.results.map(r => r.habitat),
		diets: diets.results.map(r => r.diet),
		statuses: statuses.results.map(r => r.conservation_status),
	};

	await env.CACHE.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ ...payload, cached: false });
}
