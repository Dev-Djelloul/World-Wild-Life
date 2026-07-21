const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function listSpecies(request, env) {
	const url = new URL(request.url);
	const params = url.searchParams;

	const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
	const offset = (page - 1) * limit;

	const habitat = params.get("habitat");
	const diet = params.get("diet");
	const status = params.get("status");
	const regionId = params.get("region_id");

	const conditions = [];
	const bindings = [];

	if (habitat) {
		conditions.push("s.habitat = ?");
		bindings.push(habitat);
	}
	if (diet) {
		conditions.push("s.diet = ?");
		bindings.push(diet);
	}
	if (status) {
		conditions.push("s.conservation_status = ?");
		bindings.push(status);
	}
	if (regionId) {
		conditions.push("s.id IN (SELECT species_id FROM SPECIES_REGIONS WHERE region_id = ?)");
		bindings.push(regionId);
	}

	const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

	const countQuery = `SELECT COUNT(*) as total FROM SPECIES s ${whereClause}`;
	const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
	const total = countResult?.total ?? 0;

	const dataQuery = `SELECT s.* FROM SPECIES s ${whereClause} ORDER BY s.id LIMIT ? OFFSET ?`;
	const { results } = await env.DB.prepare(dataQuery).bind(...bindings, limit, offset).all();

	return Response.json({
		species: results,
		total,
		page,
		pages: Math.max(1, Math.ceil(total / limit)),
	});
}

export async function getSpecies(id, env) {
	const species = await env.DB.prepare("SELECT * FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}
	const { results: regions } = await env.DB.prepare(
		`SELECT r.id, r.name, sr.presence FROM REGIONS r
		 JOIN SPECIES_REGIONS sr ON sr.region_id = r.id
		 WHERE sr.species_id = ?`
	).bind(id).all();
	return Response.json({ ...species, regions });
}
