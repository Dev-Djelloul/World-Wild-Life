import {
	fetchSpecies,
	fetchSpeciesById,
	searchSpecies,
	fetchFilters,
	fetchIucnStatus,
	fetchTaxonomy,
	fetchWikidata,
	fetchEol,
	fetchPhotos,
} from "./api-client.js";
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
	regionId: "",
	regionName: "",
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

let currentDetailId = null;

function renderIucnEnrichment(id, data) {
	if (currentDetailId !== id) return;
	const el = document.getElementById("enrichment-iucn");
	if (!el) return;
	if (!data || !data.iucn_status) {
		el.innerHTML = "";
		return;
	}
	el.innerHTML = `
		<h4>Statut IUCN en direct</h4>
		<p>
			<span class="status-badge status-${data.iucn_status}">${data.iucn_status}</span>
			${data.assessment_year ? `Évalué en ${data.assessment_year}` : ""}
			${data.assessment_url ? `— <a href="${data.assessment_url}" target="_blank" rel="noopener">voir l'évaluation</a>` : ""}
		</p>
	`;
}

function renderTaxonomyEnrichment(id, data) {
	if (currentDetailId !== id) return;
	const el = document.getElementById("enrichment-taxonomy");
	if (!el) return;
	if (!data || !data.class) {
		el.innerHTML = "";
		return;
	}
	el.innerHTML = `
		<h4>Taxonomie (NCBI)</h4>
		<p>${data.kingdom || "?"} &rsaquo; ${data.phylum || "?"} &rsaquo; ${data.class || "?"}</p>
	`;
}

function renderLinksEnrichment(id, wikidata, eol) {
	if (currentDetailId !== id) return;
	const el = document.getElementById("enrichment-links");
	if (!el) return;

	const links = [];
	if (wikidata?.wikidata_url) links.push(`<a href="${wikidata.wikidata_url}" target="_blank" rel="noopener">Wikidata</a>`);
	if (wikidata?.iucn_status_wikidata) links.push(`Statut IUCN (Wikidata) : ${wikidata.iucn_status_wikidata}`);
	if (eol?.eol_page_url) links.push(`<a href="${eol.eol_page_url}" target="_blank" rel="noopener">Encyclopedia of Life</a>`);

	el.innerHTML = links.length ? `<h4>En savoir plus</h4><p>${links.join(" · ")}</p>` : "";
}

function renderPhotosEnrichment(id, data) {
	if (currentDetailId !== id) return;
	const el = document.getElementById("enrichment-photos");
	if (!el) return;
	if (!data?.photos?.length) {
		el.innerHTML = "";
		return;
	}
	el.innerHTML = `
		<h4>Plus de photos (Pexels)</h4>
		<div class="photo-gallery">
			${data.photos.map(p => `
				<a href="${p.pexels_url}" target="_blank" rel="noopener" title="Photo par ${p.photographer}">
					<img src="${p.url}" alt="${data.name_common} — photo par ${p.photographer}" loading="lazy">
				</a>
			`).join("")}
		</div>
	`;
}

function loadEnrichments(id) {
	fetchIucnStatus(id).then(data => renderIucnEnrichment(id, data));
	fetchTaxonomy(id).then(data => renderTaxonomyEnrichment(id, data));
	Promise.all([fetchWikidata(id), fetchEol(id)]).then(([wikidata, eol]) => renderLinksEnrichment(id, wikidata, eol));
	fetchPhotos(id).then(data => renderPhotosEnrichment(id, data));
}

async function showDetail(id) {
	currentDetailId = id;
	detailEl.innerHTML = `<div class="detail-card">Chargement…</div>`;
	detailEl.scrollIntoView({ behavior: "smooth" });
	try {
		const s = await fetchSpeciesById(id);
		if (currentDetailId !== id) return;
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
				<div class="detail-enrichments">
					<div id="enrichment-iucn" class="enrichment-block"></div>
					<div id="enrichment-taxonomy" class="enrichment-block"></div>
					<div id="enrichment-links" class="enrichment-block"></div>
					<div id="enrichment-photos" class="enrichment-block"></div>
				</div>
			</div>
		`;
		loadEnrichments(id);
	} catch (err) {
		detailEl.innerHTML = `<div class="detail-card">Impossible de charger les détails de cette espèce.</div>`;
	}
}

function renderResultInfo(total) {
	if (!state.regionId) {
		resultInfoEl.textContent = `${total} espèce(s) trouvée(s)`;
		return;
	}
	resultInfoEl.innerHTML = "";
	resultInfoEl.append(`${total} espèce(s) trouvée(s) en ${state.regionName} `);
	const clearBtn = document.createElement("button");
	clearBtn.type = "button";
	clearBtn.className = "clear-region-filter";
	clearBtn.textContent = "✕ retirer le filtre régional";
	clearBtn.addEventListener("click", () => {
		state.regionId = "";
		state.regionName = "";
		state.page = 1;
		document.getElementById("region-species").innerHTML = "";
		loadList();
	});
	resultInfoEl.append(clearBtn);
}

async function loadList() {
	try {
		const data = await fetchSpecies({
			page: state.page,
			limit: state.limit,
			habitat: state.habitat,
			diet: state.diet,
			status: state.status,
			regionId: state.regionId,
		});
		renderList(data.species);
		renderPagination(data.page, data.pages);
		renderResultInfo(data.total);
		return data;
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

	searchInput.addEventListener("input", (e) => {
		if (state.regionId) {
			state.regionId = "";
			state.regionName = "";
			document.getElementById("region-species").innerHTML = "";
		}
		debouncedSearch(e.target.value.trim());
	});
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

async function selectRegion(region) {
	state.regionId = region.id;
	state.regionName = region.name;
	state.page = 1;
	state.searchTerm = "";
	searchInput.value = "";

	const container = document.getElementById("region-species");
	container.innerHTML = `<p>Chargement des espèces en ${region.name}…</p>`;

	const data = await loadList();

	container.innerHTML = data
		? `<p>${data.total} espèce(s) en ${region.name} — affichées dans le catalogue ci-dessous ↓</p>`
		: "";

	document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" });
}

function bindBackToTop() {
	const btn = document.getElementById("back-to-top");
	if (!btn) return;

	window.addEventListener("scroll", () => {
		btn.classList.toggle("visible", window.scrollY > 500);
	});

	btn.addEventListener("click", () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	});
}

async function init() {
	bindFilterEvents();
	bindBackToTop();
	await populateFilters();
	await loadList();
	await initMap(selectRegion);
	await initDashboard();
}

init();
