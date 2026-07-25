const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30j — les données Wikidata changent rarement

// Wikimedia impose un User-Agent descriptif depuis 2026 (https://w.wiki/4wJS) — sans lui,
// l'API renvoie un message d'erreur en texte brut au lieu du JSON attendu.
const WIKIMEDIA_USER_AGENT = "WorldWildLife/1.0 (https://world-wild-life.netlify.app; contact via GitHub Dev-Djelloul)";

function commonsFileUrl(filename) {
	return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

async function fetchLabel(entityId) {
	const res = await fetch(
		`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&format=json&props=labels&languages=en`,
		{ headers: { "User-Agent": WIKIMEDIA_USER_AGENT } }
	);
	if (!res.ok) {
		await res.body?.cancel();
		return null;
	}
	const data = await res.json();
	return data.entities?.[entityId]?.labels?.en?.value ?? null;
}

async function fetchWikidataEntity(species) {
	const searchRes = await fetch(
		`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(species.name_scientific)}&language=en&format=json&type=item&limit=1`,
		{ headers: { "User-Agent": WIKIMEDIA_USER_AGENT } }
	);
	if (!searchRes.ok) {
		await searchRes.body?.cancel();
		return null;
	}

	const searchData = await searchRes.json();
	const entityId = searchData.search?.[0]?.id;
	if (!entityId) return null;

	const entityRes = await fetch(
		`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&format=json&props=claims|labels&languages=en`,
		{ headers: { "User-Agent": WIKIMEDIA_USER_AGENT } }
	);
	if (!entityRes.ok) {
		await entityRes.body?.cancel();
		return null;
	}

	const entityData = await entityRes.json();
	const entity = entityData.entities?.[entityId];
	if (!entity) return null;

	const claims = entity.claims ?? {};
	const imageFilename = claims.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
	const iucnEntityId = claims.P141?.[0]?.mainsnak?.datavalue?.value?.id ?? null;

	const iucnStatusLabel = iucnEntityId ? await fetchLabel(iucnEntityId) : null;

	return {
		name_common: species.name_common,
		name_scientific: species.name_scientific,
		wikidata_id: entityId,
		wikidata_url: `https://www.wikidata.org/wiki/${entityId}`,
		label: entity.labels?.en?.value ?? null,
		image_url: imageFilename ? commonsFileUrl(imageFilename) : null,
		iucn_status_wikidata: iucnStatusLabel,
	};
}

export async function getLiveWikidata(id, env) {
	const species = await env.DB.prepare("SELECT id, name_common, name_scientific FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}

	const cacheKey = `wikidata:${species.id}`;
	const cached = await env.CACHE.get(cacheKey, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const data = await fetchWikidataEntity(species);
	if (!data) {
		return Response.json(
			{
				name_common: species.name_common,
				name_scientific: species.name_scientific,
				message: "Aucune entité Wikidata trouvée pour ce nom scientifique",
			},
			{ status: 200 }
		);
	}

	await env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: CACHE_TTL_SECONDS });
	return Response.json({ ...data, cached: false });
}
