const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7j

async function fetchPexelsPhotos(species, env) {
	const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(species.name_common)}&per_page=5`, {
		headers: { Authorization: env.PEXELS_API_KEY },
	});

	if (!res.ok) {
		await res.body?.cancel();
		return [];
	}

	const data = await res.json();
	return (data.photos ?? []).map(p => ({
		url: p.src.medium,
		width: p.width,
		height: p.height,
		photographer: p.photographer,
		pexels_url: p.url,
	}));
}

// Photos supplémentaires depuis Pexels, en complément des photos Wikimedia déjà en base
// (celles-ci restent la source principale — Pexels sert de galerie alternative).
export async function getLivePhotos(id, env) {
	if (!env.PEXELS_API_KEY) {
		return Response.json({ error: "Intégration Pexels non configurée (PEXELS_API_KEY manquant)" }, { status: 503 });
	}

	const species = await env.DB.prepare("SELECT id, name_common, name_scientific FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}

	const cacheKey = `pexels:${species.id}`;
	const cached = await env.CACHE.get(cacheKey, "json");
	if (cached) {
		return Response.json({ name_common: species.name_common, photos: cached, cached: true });
	}

	const photos = await fetchPexelsPhotos(species, env);
	await env.CACHE.put(cacheKey, JSON.stringify(photos), { expirationTtl: CACHE_TTL_SECONDS });

	return Response.json({ name_common: species.name_common, photos, cached: false });
}
