export async function searchSpecies(request, env) {
	const url = new URL(request.url);
	const q = (url.searchParams.get("q") || "").trim();
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));

	if (q.length < 2) {
		return Response.json({ error: "Le paramètre 'q' doit contenir au moins 2 caractères" }, { status: 400 });
	}

	const like = `%${q}%`;
	const { results } = await env.DB.prepare(
		`SELECT id, name_common, name_scientific, habitat, diet, conservation_status, image_url
		 FROM SPECIES
		 WHERE name_common LIKE ? OR name_scientific LIKE ? OR habitat LIKE ? OR description LIKE ?
		 ORDER BY name_common
		 LIMIT ?`
	).bind(like, like, like, like, limit).all();

	return Response.json({ results, count: results.length });
}
