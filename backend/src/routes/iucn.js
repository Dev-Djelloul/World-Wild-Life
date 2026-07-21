const CACHE_TTL_SECONDS = 86400; // 24h — les statuts IUCN changent rarement

export async function getLiveIucnStatus(id, env) {
	if (!env.IUCN_API_TOKEN) {
		return Response.json({ error: "Intégration IUCN non configurée (IUCN_API_TOKEN manquant)" }, { status: 503 });
	}

	const species = await env.DB.prepare("SELECT id, name_common, name_scientific FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}

	const cacheKey = `iucn:${species.id}`;
	const cached = await env.CACHE.get(cacheKey, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const parts = species.name_scientific.split(" ");
	const [genus_name, species_name, infra_name] = parts;
	const params = new URLSearchParams({ genus_name, species_name });
	if (infra_name) params.set("infra_name", infra_name);

	const res = await fetch(`https://api.iucnredlist.org/api/v4/taxa/scientific_name?${params}`, {
		headers: { Authorization: env.IUCN_API_TOKEN },
	});

	if (!res.ok) {
		return Response.json({
			name_common: species.name_common,
			name_scientific: species.name_scientific,
			iucn_status: null,
			message: "Aucune évaluation IUCN trouvée pour ce nom scientifique",
		}, { status: 200 });
	}

	const data = await res.json();
	const assessments = data.assessments || [];
	const latestGlobal = assessments.find(a => a.latest && a.scopes?.some(sc => sc.code === "1"));
	const latest = latestGlobal || assessments.find(a => a.latest) || null;

	const payload = {
		name_common: species.name_common,
		name_scientific: species.name_scientific,
		iucn_status: latest?.red_list_category_code ?? null,
		assessment_year: latest?.year_published ?? null,
		assessment_url: latest?.url ?? null,
	};

	await env.CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ ...payload, cached: false });
}
