const API_BASE_URL = "https://world-wild-life-api.djelloulabid75.workers.dev";

export async function fetchSpecies({ page = 1, limit = 20, habitat = "", diet = "", status = "" } = {}) {
	const params = new URLSearchParams({ page, limit });
	if (habitat) params.set("habitat", habitat);
	if (diet) params.set("diet", diet);
	if (status) params.set("status", status);

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

export async function fetchRegions() {
	const response = await fetch(`${API_BASE_URL}/regions`);
	if (!response.ok) throw new Error("Erreur lors du chargement des régions");
	const data = await response.json();
	return data.regions;
}

export async function fetchRegionSpecies(regionId, limit = 20) {
	const response = await fetch(`${API_BASE_URL}/regions/${regionId}/species?limit=${limit}`);
	if (!response.ok) throw new Error("Erreur lors du chargement des espèces de la région");
	return response.json();
}

export async function fetchStats() {
	const response = await fetch(`${API_BASE_URL}/stats`);
	if (!response.ok) throw new Error("Erreur lors du chargement des statistiques");
	return response.json();
}
