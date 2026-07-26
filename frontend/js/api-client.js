const API_BASE_URL = "https://world-wild-life-api.djelloulabid75.workers.dev";

export async function fetchSpecies({ page = 1, limit = 20, habitat = "", diet = "", status = "", regionId = "" } = {}) {
	const params = new URLSearchParams({ page, limit });
	if (habitat) params.set("habitat", habitat);
	if (diet) params.set("diet", diet);
	if (status) params.set("status", status);
	if (regionId) params.set("region_id", regionId);

	const response = await fetch(`${API_BASE_URL}/species?${params}`);
	if (!response.ok) throw new Error("Erreur lors du chargement des espèces");
	return response.json();
}

export async function fetchSpeciesById(id) {
	const response = await fetch(`${API_BASE_URL}/species/${id}`);
	if (!response.ok) throw new Error("Erreur lors du chargement de l'espèce");
	return response.json();
}

export async function searchSpecies(q, limit = 10) {
	const params = new URLSearchParams({ q, limit });
	const response = await fetch(`${API_BASE_URL}/search?${params}`);
	if (!response.ok) throw new Error("Erreur lors de la recherche");
	return response.json();
}

export async function fetchFilters() {
	const response = await fetch(`${API_BASE_URL}/filters`);
	if (!response.ok) throw new Error("Erreur lors du chargement des filtres");
	return response.json();
}

// Récupère la totalité des espèces d'une région (pas seulement une page) : l'API plafonne
// à 100 résultats par requête, donc on boucle sur les pages suivantes si nécessaire — aucune
// région n'en compte autant aujourd'hui (max 77), mais ça reste correct si le jeu de données grandit.
export async function fetchAllSpeciesInRegion(regionId) {
	const first = await fetchSpecies({ regionId, page: 1, limit: 100 });
	if (!first) return null;
	if (first.pages <= 1) return first;

	const rest = await Promise.all(
		Array.from({ length: first.pages - 1 }, (_, i) => fetchSpecies({ regionId, page: i + 2, limit: 100 }))
	);
	const species = [first, ...rest].flatMap(r => r?.species ?? []);
	return { ...first, species };
}

export async function fetchRegions() {
	const response = await fetch(`${API_BASE_URL}/regions`);
	if (!response.ok) throw new Error("Erreur lors du chargement des régions");
	const data = await response.json();
	return data.regions;
}

export async function fetchStats() {
	const response = await fetch(`${API_BASE_URL}/stats`);
	if (!response.ok) throw new Error("Erreur lors du chargement des statistiques");
	return response.json();
}

// Enrichissements : chacun peut échouer ou n'avoir aucune donnée indépendamment
// des autres (ex. Pexels sans clé configurée) — jamais bloquant pour la fiche détail.
async function fetchEnrichment(path) {
	const response = await fetch(`${API_BASE_URL}${path}`);
	if (!response.ok) return null;
	return response.json();
}

export const fetchIucnStatus = (id) => fetchEnrichment(`/species/${id}/iucn`);
export const fetchTaxonomy = (id) => fetchEnrichment(`/species/${id}/taxonomy`);
export const fetchWikidata = (id) => fetchEnrichment(`/species/${id}/wikidata`);
export const fetchEol = (id) => fetchEnrichment(`/species/${id}/eol`);
export const fetchPhotos = (id) => fetchEnrichment(`/species/${id}/photos`);
