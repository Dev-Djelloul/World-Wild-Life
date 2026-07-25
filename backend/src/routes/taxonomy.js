const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30j — la taxonomie ne change quasiment jamais
const NCBI_DELAY_MS = 400; // respecte la limite NCBI eutils de 3 requêtes/seconde sans clé API

// NCBI utilise "Metazoa" comme rang kingdom pour les animaux ; le jeu de données
// du projet utilise systématiquement "Animalia" (synonyme) — on normalise pour rester cohérent.
const KINGDOM_ALIASES = { Metazoa: "Animalia" };

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function parseLineage(xml) {
	const lineageMatch = xml.match(/<LineageEx>([\s\S]*?)<\/LineageEx>/);
	if (!lineageMatch) return {};

	const taxa = lineageMatch[1].match(/<Taxon>[\s\S]*?<\/Taxon>/g) || [];
	const result = {};
	for (const taxon of taxa) {
		const rank = taxon.match(/<Rank>([^<]*)<\/Rank>/)?.[1];
		const name = taxon.match(/<ScientificName>([^<]*)<\/ScientificName>/)?.[1];
		if (rank === "kingdom") result.kingdom = KINGDOM_ALIASES[name] ?? name;
		if (rank === "phylum") result.phylum = name;
		if (rank === "class") result.class = name;
	}
	return result;
}

async function fetchNcbiTaxonomy(species) {
	const searchRes = await fetch(
		`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=taxonomy&retmode=json&term=${encodeURIComponent(species.name_scientific)}`
	);
	if (!searchRes.ok) {
		await searchRes.body?.cancel();
		return null;
	}

	const searchData = await searchRes.json();
	const taxId = searchData.esearchresult?.idlist?.[0];
	if (!taxId) return null;

	const fetchRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=taxonomy&retmode=xml&id=${taxId}`);
	if (!fetchRes.ok) {
		await fetchRes.body?.cancel();
		return null;
	}

	const xml = await fetchRes.text();
	const lineage = parseLineage(xml);
	if (!lineage.kingdom && !lineage.phylum && !lineage.class) return null;

	return {
		name_common: species.name_common,
		name_scientific: species.name_scientific,
		ncbi_tax_id: taxId,
		...lineage,
	};
}

export async function getLiveTaxonomy(id, env) {
	const species = await env.DB.prepare("SELECT id, name_common, name_scientific FROM SPECIES WHERE id = ?").bind(id).first();
	if (!species) {
		return Response.json({ error: "Espèce introuvable" }, { status: 404 });
	}

	const cacheKey = `taxonomy:${species.id}`;
	const cached = await env.CACHE.get(cacheKey, "json");
	if (cached) {
		return Response.json({ ...cached, cached: true });
	}

	const taxonomy = await fetchNcbiTaxonomy(species);
	if (!taxonomy) {
		return Response.json(
			{
				name_common: species.name_common,
				name_scientific: species.name_scientific,
				message: "Aucune taxonomie trouvée sur NCBI pour ce nom scientifique",
			},
			{ status: 200 }
		);
	}

	await env.CACHE.put(cacheKey, JSON.stringify(taxonomy), { expirationTtl: CACHE_TTL_SECONDS });
	return Response.json({ ...taxonomy, cached: false });
}

// Rafraîchissement périodique (Cron Trigger) : vérifie/corrige kingdom, phylum et class
// pour toutes les espèces ayant un nom scientifique, via l'API NCBI Taxonomy.
export async function syncAllTaxonomies(env) {
	const { results: species } = await env.DB
		.prepare("SELECT id, name_common, name_scientific, kingdom, phylum, class FROM SPECIES WHERE name_scientific IS NOT NULL")
		.all();

	let updated = 0;
	for (const sp of species) {
		const taxonomy = await fetchNcbiTaxonomy(sp);

		if (taxonomy) {
			await env.CACHE.put(`taxonomy:${sp.id}`, JSON.stringify(taxonomy), { expirationTtl: CACHE_TTL_SECONDS });

			const changed =
				(taxonomy.kingdom && taxonomy.kingdom !== sp.kingdom) ||
				(taxonomy.phylum && taxonomy.phylum !== sp.phylum) ||
				(taxonomy.class && taxonomy.class !== sp.class);

			if (changed) {
				await env.DB.prepare(
					"UPDATE SPECIES SET kingdom = COALESCE(?, kingdom), phylum = COALESCE(?, phylum), class = COALESCE(?, class) WHERE id = ?"
				)
					.bind(taxonomy.kingdom ?? null, taxonomy.phylum ?? null, taxonomy.class ?? null, sp.id)
					.run();
				updated++;
			}
		}

		await sleep(NCBI_DELAY_MS);
	}

	console.log(`Synchro taxonomie terminée : ${updated}/${species.length} fiches mises à jour`);
	return { checked: species.length, updated };
}
