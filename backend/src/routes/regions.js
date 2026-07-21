const CACHE_KEY = "regions:list";
const CACHE_TTL_SECONDS = 3600;

export async function listRegions(request, env) {
	const cached = await env.CACHE.get(CACHE_KEY, "json");
	if (cached) {
		return Response.json({ regions: cached, cached: true });
	}

	const { results } = await env.DB.prepare("SELECT * FROM REGIONS ORDER BY id").all();
	await env.CACHE.put(CACHE_KEY, JSON.stringify(results), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ regions: results, cached: false });
}

export async function getRegionSpecies(id, request, env) {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
	const offset = (page - 1) * limit;

	const region = await env.DB.prepare("SELECT * FROM REGIONS WHERE id = ?").bind(id).first();
	if (!region) {
		return Response.json({ error: "Région introuvable" }, { status: 404 });
	}

	const countResult = await env.DB.prepare(
		"SELECT COUNT(*) as total FROM SPECIES_REGIONS WHERE region_id = ?"
	).bind(id).first();
	const total = countResult?.total ?? 0;

	const { results: species } = await env.DB.prepare(
		`SELECT s.*, sr.presence FROM SPECIES s
		 JOIN SPECIES_REGIONS sr ON sr.species_id = s.id
		 WHERE sr.region_id = ?
		 ORDER BY s.name_common
		 LIMIT ? OFFSET ?`
	).bind(id, limit, offset).all();

	return Response.json({ region: region.name, species, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}
