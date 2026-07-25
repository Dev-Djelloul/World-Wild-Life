const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30j — le lien de fiche EOL ne change quasiment jamais

// L'API classique eol.org/api/pages (descriptions, images, IUCN) est dépréciée côté EOL
// et ne renvoie plus que des métadonnées vides. On se limite donc à retrouver l'identifiant
// de la page via /api/search et à exposer un lien direct vers la fiche officielle.
async function fetchEolPageLink(species) {
	const res = await fetch(
		`https://eol.org/api/search/1.0.json?q=${encodeURIComponent(species.name_scientific)}&exact=true`
	);
	if (!res.ok) {
		await res.body?.cancel();
		return null;
	}

	const data = await res.json();
	const match =
		data.results?.find(r => r.title?.toLowerCase() === species.name_scientific.toLowerCase()) ?? data.results?.[0];
	if (!match) return null;

	return {
		name_common: species.name_common,
		name_scientific: species.name_scientific,
		eol_page_id: match.id,
		eol_page_url: match.link ?? `https://eol.org/pages/${match.id}`,
	};
}

export async function getLiveEol(id, env) {
	const species = await env.DB.prepare("SELECT id, name_common, name_scientific FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}

	const cacheKey = `eol:${species.id}`;
	const cached = await env.CACHE.get(cacheKey, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const data = await fetchEolPageLink(species);
	if (!data) {
		return Response.json(
			{
				name_common: species.name_common,
				name_scientific: species.name_scientific,
				message: "Aucune fiche Encyclopedia of Life trouvée pour ce nom scientifique",
			},
			{ status: 200 }
		);
	}

	await env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: CACHE_TTL_SECONDS });
	return Response.json({ ...data, cached: false });
}
