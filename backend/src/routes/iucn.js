const CACHE_TTL_SECONDS = 86400; // 24h — les statuts IUCN changent rarement
const SYNC_BATCH_SIZE = 10; // requêtes IUCN en parallèle pendant la synchro cron

async function fetchIucnAssessment(species, env) {
	const parts = species.name_scientific.split(" ");
	const [genus_name, species_name, infra_name] = parts;
	const params = new URLSearchParams({ genus_name, species_name });
	if (infra_name) params.set("infra_name", infra_name);

	const res = await fetch(`https://api.iucnredlist.org/api/v4/taxa/scientific_name?${params}`, {
		headers: { Authorization: env.IUCN_API_TOKEN },
	});

	if (!res.ok) {
		await res.body?.cancel();
		return {
			name_common: species.name_common,
			name_scientific: species.name_scientific,
			iucn_status: null,
			message: "Aucune évaluation IUCN trouvée pour ce nom scientifique",
		};
	}

	const data = await res.json();
	const assessments = data.assessments || [];
	const latestGlobal = assessments.find(a => a.latest && a.scopes?.some(sc => sc.code === "1"));
	const latest = latestGlobal || assessments.find(a => a.latest) || null;

	return {
		name_common: species.name_common,
		name_scientific: species.name_scientific,
		iucn_status: latest?.red_list_category_code ?? null,
		assessment_year: latest?.year_published ?? null,
		assessment_url: latest?.url ?? null,
	};
}

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

	const payload = await fetchIucnAssessment(species, env);
	await env.CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ ...payload, cached: false });
}

// Rafraîchissement périodique (Cron Trigger) : resynchronise le statut de conservation
// de toutes les espèces ayant un nom scientifique, et met à jour SPECIES + le cache KV.
export async function syncAllIucnStatuses(env) {
	if (!env.IUCN_API_TOKEN) {
		console.error("Synchro IUCN ignorée : IUCN_API_TOKEN manquant");
		return { checked: 0, updated: 0 };
	}

	const { results: species } = await env.DB
		.prepare("SELECT id, name_common, name_scientific, conservation_status FROM SPECIES WHERE name_scientific IS NOT NULL")
		.all();

	let updated = 0;
	for (let i = 0; i < species.length; i += SYNC_BATCH_SIZE) {
		const batch = species.slice(i, i + SYNC_BATCH_SIZE);
		const assessments = await Promise.all(batch.map(sp => fetchIucnAssessment(sp, env)));

		for (let j = 0; j < batch.length; j++) {
			const sp = batch[j];
			const assessment = assessments[j];

			await env.CACHE.put(`iucn:${sp.id}`, JSON.stringify(assessment), { expirationTtl: CACHE_TTL_SECONDS });

			if (assessment.iucn_status && assessment.iucn_status !== sp.conservation_status) {
				await env.DB.prepare("UPDATE SPECIES SET conservation_status = ? WHERE id = ?").bind(assessment.iucn_status, sp.id).run();
				updated++;
			}
		}
	}

	console.log(`Synchro IUCN terminée : ${updated}/${species.length} statuts mis à jour`);
	return { checked: species.length, updated };
}
