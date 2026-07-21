const CACHE_KEY = "stats:global";
const CACHE_TTL_SECONDS = 900;

export async function getStats(request, env) {
	const cached = await env.CACHE.get(CACHE_KEY, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const [totalResult, byStatus, byHabitat, byDiet] = await Promise.all([
		env.DB.prepare("SELECT COUNT(*) as total FROM SPECIES").first(),
		env.DB.prepare("SELECT conservation_status, COUNT(*) as n FROM SPECIES GROUP BY conservation_status").all(),
		env.DB.prepare("SELECT habitat, COUNT(*) as n FROM SPECIES GROUP BY habitat").all(),
		env.DB.prepare("SELECT diet, COUNT(*) as n FROM SPECIES GROUP BY diet").all(),
	]);

	const toMap = (rows, key) => Object.fromEntries(rows.map(r => [r[key], r.n]));

	const payload = {
		total_species: totalResult?.total ?? 0,
		by_status: toMap(byStatus.results, "conservation_status"),
		by_habitat: toMap(byHabitat.results, "habitat"),
		by_diet: toMap(byDiet.results, "diet"),
	};

	await env.CACHE.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ ...payload, cached: false });
}
