import { fetchSpecies, fetchSpeciesById, searchSpecies, fetchFilters } from "./api-client.js";
import { debounce } from "./search.js";
import { initMap } from "./map.js";
import { initDashboard } from "./charts.js";

const listEl = document.getElementById("species-list");
const detailEl = document.getElementById("species-detail");
const paginationEl = document.getElementById("pagination");
const habitatSelect = document.getElementById("filter-habitat");
const dietSelect = document.getElementById("filter-diet");
const statusSelect = document.getElementById("filter-status");
const searchInput = document.getElementById("search-input");
const resultInfoEl = document.getElementById("result-info");

const state = {
	page: 1,
	limit: 20,
	habitat: "",
	diet: "",
	status: "",
	searchTerm: "",
};

function renderList(species) {
	if (!species.length) {
		listEl.innerHTML = `<li class="empty-state">Aucune espèce ne correspond à ces critères.</li>`;
		return;
	}

	listEl.innerHTML = species.map(s => `
		<li class="species-card" data-id="${s.id}" tabindex="0">
			${s.image_url ? `<img class="species-thumb" src="${s.image_url}" alt="${s.name_common}" onerror="this.remove()">` : ""}
			<strong>${s.name_common}</strong>
			<em>${s.name_scientific}</em>
			<div class="status">
				<span class="status-badge status-${s.conservation_status}">${s.conservation_status}</span>
				${s.habitat} — ${s.diet}
			</div>
		</li>
	`).join("");

	listEl.querySelectorAll(".species-card").forEach(card => {
		card.addEventListener("click", () => showDetail(card.dataset.id));
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				showDetail(card.dataset.id);
			}
		});
	});
}

function renderPagination(page, pages) {
	if (state.searchTerm) {
		paginationEl.innerHTML = "";
		return;
	}
	const prevDisabled = page <= 1 ? "disabled" : "";
	const nextDisabled = page >= pages ? "disabled" : "";
	paginationEl.innerHTML = `
		<button id="prev-page" ${prevDisabled}>&larr; Précédent</button>
		<span>Page ${page} / ${pages}</span>
		<button id="next-page" ${nextDisabled}>Suivant &rarr;</button>
	`;
	document.getElementById("prev-page")?.addEventListener("click", () => {
		if (state.page > 1) { state.page -= 1; loadList(); }
	});
	document.getElementById("next-page")?.addEventListener("click", () => {
		if (state.page < pages) { state.page += 1; loadList(); }
	});
}

async function showDetail(id) {
	detailEl.innerHTML = `<div class="detail-card">Chargement…</div>`;
	detailEl.scrollIntoView({ behavior: "smooth" });
	try {
		const s = await fetchSpeciesById(id);
		const regions = s.regions.map(r => `${r.name} (${r.presence})`).join(", ");
		detailEl.innerHTML = `
			<div class="detail-card">
				${s.image_url ? `<img class="detail-thumb" src="${s.image_url}" alt="${s.name_common}">` : ""}
				<h2>${s.name_common} <em>(${s.name_scientific})</em></h2>
				<div class="detail-meta">
					<span><span class="status-badge status-${s.conservation_status}">${s.conservation_status}</span> Statut UICN</span>
					<span><strong>Habitat :</strong> ${s.habitat}</span>
					<span><strong>Régime :</strong> ${s.diet}</span>
					<span><strong>Tendance :</strong> ${s.population_trend}</span>
				</div>
				<p>${s.description}</p>
				<p><strong>Régions :</strong> ${regions || "Non renseigné"}</p>
			</div>
		`;
	} catch (err) {
		detailEl.innerHTML = `<div class="detail-card">Impossible de charger les détails de cette espèce.</div>`;
	}
}

async function loadList() {
	try {
		const data = await fetchSpecies({
			page: state.page,
			limit: state.limit,
			habitat: state.habitat,
			diet: state.diet,
			status: state.status,
		});
		renderList(data.species);
		renderPagination(data.page, data.pages);
		resultInfoEl.textContent = `${data.total} espèce(s) trouvée(s)`;
	} catch (err) {
		listEl.innerHTML = `<li class="empty-state">Impossible de charger les espèces. L'API backend est-elle accessible ?</li>`;
	}
}

async function runSearch(term) {
	try {
		const data = await searchSpecies(term, 30);
		renderList(data.results.map(r => ({ ...r })));
		renderPagination(1, 1);
		resultInfoEl.textContent = `${data.count} résultat(s) pour "${term}"`;
	} catch (err) {
		listEl.innerHTML = `<li class="empty-state">Erreur lors de la recherche.</li>`;
	}
}

const debouncedSearch = debounce((term) => {
	state.searchTerm = term;
	if (term.length >= 2) {
		runSearch(term);
	} else {
		state.page = 1;
		loadList();
	}
}, 350);

function bindFilterEvents() {
	[habitatSelect, dietSelect, statusSelect].forEach(select => {
		select.addEventListener("change", () => {
			state.habitat = habitatSelect.value;
			state.diet = dietSelect.value;
			state.status = statusSelect.value;
			state.page = 1;
			state.searchTerm = "";
			searchInput.value = "";
			loadList();
		});
	});

	searchInput.addEventListener("input", (e) => debouncedSearch(e.target.value.trim()));
}

async function populateFilters() {
	try {
		const { habitats, diets, statuses } = await fetchFilters();
		habitatSelect.innerHTML = `<option value="">Tous les habitats</option>` +
			habitats.map(h => `<option value="${h}">${h}</option>`).join("");
		dietSelect.innerHTML = `<option value="">Tous les régimes</option>` +
			diets.map(d => `<option value="${d}">${d}</option>`).join("");
		statusSelect.innerHTML = `<option value="">Tous les statuts</option>` +
			statuses.map(s => `<option value="${s}">${s}</option>`).join("");
	} catch (err) {
		// filtres non bloquants si l'API est indisponible
	}
}

function renderRegionSpecies(data) {
	const container = document.getElementById("region-species");
	container.innerHTML = `
		<h3>Espèces en ${data.region} (${data.total})</h3>
		<ul class="region-species-list">
			${data.species.map(s => `<li>${s.name_common} <em>(${s.name_scientific})</em> — ${s.conservation_status}</li>`).join("")}
		</ul>
	`;
	container.scrollIntoView({ behavior: "smooth" });
}

async function init() {
	bindFilterEvents();
	await populateFilters();
	await loadList();
	await initMap(renderRegionSpecies);
	await initDashboard();
}

init();
