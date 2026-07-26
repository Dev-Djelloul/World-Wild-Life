import {
	fetchSpecies,
	fetchSpeciesById,
	searchSpecies,
	fetchFilters,
	fetchAllSpeciesInRegion,
	fetchIucnStatus,
	fetchTaxonomy,
	fetchWikidata,
	fetchEol,
	fetchPhotos,
} from "./api-client.js";
import { debounce } from "./search.js";
import { initMap } from "./map.js";
import { initDashboard } from "./charts.js";
import { i18nInstance } from "./i18n.js";

// Définitions UICN pour les tooltips
const IUCN_DEFINITIONS = {
	LC: "Least Concern (Préoccupation mineure) — Espèce évaluée avec le risque d'extinction le plus faible",
	NT: "Near Threatened (Quasi menacée) — Espèce proche des critères de vulnérabilité",
	VU: "Vulnerable (Vulnérable) — Espèce face à un risque d'extinction élevé à l'état sauvage",
	EN: "Endangered (En danger) — Espèce face à un risque très élevé d'extinction imminente",
	CR: "Critically Endangered (En danger critique) — Espèce face à un risque extrêmement élevé d'extinction immédiate",
	DD: "Data Deficient (Données insuffisantes) — Données inadéquates pour évaluer le statut de conservation",
};

function getStatusTitle(status) {
	return IUCN_DEFINITIONS[status] || status;
}

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
		listEl.innerHTML = `<li class="empty-state">${i18nInstance.t("no_species_match")}</li>`;
		return;
	}

	listEl.innerHTML = species.map(s => `
		<li class="species-card" data-id="${s.id}" tabindex="0">
			${s.image_url ? `<img class="species-thumb" src="${s.image_url}" alt="${i18nInstance.species(s.name_common)}" onerror="this.remove()">` : ""}
			<strong>${i18nInstance.species(s.name_common)}</strong>
			<em>${s.name_scientific}</em>
			<div class="status">
				<span class="status-badge status-${s.conservation_status}" title="${getStatusTitle(s.conservation_status)}">${s.conservation_status}</span>
				${i18nInstance.habitat(s.habitat)} — ${i18nInstance.diet(s.diet)}
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
		<button id="prev-page" ${prevDisabled}>${i18nInstance.t("prev")}</button>
		<span>${i18nInstance.t("page_of", { page, pages })}</span>
		<button id="next-page" ${nextDisabled}>${i18nInstance.t("next")}</button>
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
		<h4>${i18nInstance.t("iucn_live_status")}</h4>
		<p>
			<span class="status-badge status-${data.iucn_status}" title="${getStatusTitle(data.iucn_status)}">${data.iucn_status}</span>
			${data.assessment_year ? i18nInstance.t("assessed_in", { year: data.assessment_year }) : ""}
			${data.assessment_url ? `— <a href="${data.assessment_url}" target="_blank" rel="noopener">${i18nInstance.t("view_assessment")}</a>` : ""}
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
		<h4>${i18nInstance.t("taxonomy_title")}</h4>
		<p>${data.kingdom || "?"} &rsaquo; ${data.phylum || "?"} &rsaquo; ${data.class || "?"}</p>
	`;
}

function renderLinksEnrichment(id, wikidata, eol) {
	if (currentDetailId !== id) return;
	const el = document.getElementById("enrichment-links");
	if (!el) return;

	const links = [];
	if (wikidata?.wikidata_url) links.push(`<a href="${wikidata.wikidata_url}" target="_blank" rel="noopener">Wikidata</a>`);
	if (wikidata?.iucn_status_wikidata) links.push(`${i18nInstance.t("iucn_status_wikidata")} : ${wikidata.iucn_status_wikidata}`);
	if (eol?.eol_page_url) links.push(`<a href="${eol.eol_page_url}" target="_blank" rel="noopener">Encyclopedia of Life</a>`);

	el.innerHTML = links.length ? `<h4>${i18nInstance.t("learn_more")}</h4><p>${links.join(" · ")}</p>` : "";
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
		<h4>${i18nInstance.t("more_photos")}</h4>
		<div class="photo-gallery">
			${data.photos.map(p => `
				<a href="${p.pexels_url}" target="_blank" rel="noopener" title="${i18nInstance.t("photo_by", { name: p.photographer })}">
					<img src="${p.url}" alt="${i18nInstance.species(data.name_common)} — ${i18nInstance.t("photo_by", { name: p.photographer })}" loading="lazy">
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
	detailEl.innerHTML = `<div class="detail-card">${i18nInstance.t("loading")}</div>`;
	detailEl.scrollIntoView({ behavior: "smooth" });
	try {
		const s = await fetchSpeciesById(id);
		if (currentDetailId !== id) return;
		const regions = s.regions.map(r => `${i18nInstance.region(r.name)} (${i18nInstance.presence(r.presence)})`).join(", ");
		detailEl.innerHTML = `
			<div class="detail-card">
				${s.image_url ? `<img class="detail-thumb" src="${s.image_url}" alt="${i18nInstance.species(s.name_common)}">` : ""}
				<h2>${i18nInstance.species(s.name_common)} <em>(${s.name_scientific})</em></h2>
				<div class="detail-meta">
					<span><span class="status-badge status-${s.conservation_status}" title="${getStatusTitle(s.conservation_status)}">${s.conservation_status}</span> ${i18nInstance.t("iucn_status_label")}</span>
					<span><strong>${i18nInstance.t("habitat_label")}</strong> ${i18nInstance.habitat(s.habitat)}</span>
					<span><strong>${i18nInstance.t("diet_label")}</strong> ${i18nInstance.diet(s.diet)}</span>
					<span><strong>${i18nInstance.t("trend_label")}</strong> ${i18nInstance.trend(s.population_trend)}</span>
				</div>
				<p>${s.description}</p>
				<p><strong>${i18nInstance.t("regions_label")}</strong> ${regions || i18nInstance.t("not_specified")}</p>
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
		detailEl.innerHTML = `<div class="detail-card">${i18nInstance.t("detail_load_error")}</div>`;
	}
}

function renderResultInfo(total) {
	if (!state.regionId) {
		resultInfoEl.textContent = i18nInstance.t("species_found", { n: total });
		return;
	}
	resultInfoEl.innerHTML = "";
	resultInfoEl.append(i18nInstance.t("species_found_in_region", { n: total, region: i18nInstance.region(state.regionName) }) + " ");
	const clearBtn = document.createElement("button");
	clearBtn.type = "button";
	clearBtn.className = "clear-region-filter";
	clearBtn.textContent = i18nInstance.t("remove_region_filter");
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
		listEl.innerHTML = `<li class="empty-state">${i18nInstance.t("api_unreachable")}</li>`;
	}
}

async function runSearch(term) {
	try {
		const data = await searchSpecies(term, 30);
		renderList(data.results.map(r => ({ ...r })));
		renderPagination(1, 1);
		resultInfoEl.textContent = i18nInstance.t("results_for", { n: data.count, term });
	} catch (err) {
		listEl.innerHTML = `<li class="empty-state">${i18nInstance.t("search_error")}</li>`;
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

let cachedFilters = null;

function renderFilterOptions() {
	if (!cachedFilters) return;
	const { habitats, diets, statuses } = cachedFilters;
	const prevValues = { habitat: habitatSelect.value, diet: dietSelect.value, status: statusSelect.value };

	habitatSelect.innerHTML = `<option value="">${i18nInstance.t("all_habitats")}</option>` +
		habitats.map(h => `<option value="${h}">${i18nInstance.habitat(h)}</option>`).join("");
	dietSelect.innerHTML = `<option value="">${i18nInstance.t("all_diets")}</option>` +
		diets.map(d => `<option value="${d}">${i18nInstance.diet(d)}</option>`).join("");
	statusSelect.innerHTML = `<option value="">${i18nInstance.t("all_status")}</option>` +
		statuses.map(s => `<option value="${s}">${i18nInstance.t(`uicn_status.${s}`)}</option>`).join("");

	habitatSelect.value = prevValues.habitat;
	dietSelect.value = prevValues.diet;
	statusSelect.value = prevValues.status;
}

async function populateFilters() {
	try {
		cachedFilters = await fetchFilters();
		renderFilterOptions();
	} catch (err) {
		// filtres non bloquants si l'API est indisponible
	}
}

function renderRegionQuickList(region, data) {
	const container = document.getElementById("region-species");
	container.innerHTML = `
		<h3>${i18nInstance.t("species_in_region", { region: i18nInstance.region(region.name), count: data.total })}</h3>
		<ul class="region-species-list">
			${data.species.map(s => `
				<li class="region-species-item" data-id="${s.id}" tabindex="0">
					<span class="status-badge status-${s.conservation_status}" title="${getStatusTitle(s.conservation_status)}">${s.conservation_status}</span>
					${i18nInstance.species(s.name_common)} <em>(${s.name_scientific})</em>
				</li>
			`).join("")}
		</ul>
	`;

	container.querySelectorAll(".region-species-item").forEach(item => {
		item.addEventListener("click", () => showDetail(item.dataset.id));
		item.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				showDetail(item.dataset.id);
			}
		});
	});
}

let lastQuickListRegion = null;
let lastQuickListData = null;

async function selectRegion(region) {
	state.regionId = region.id;
	state.regionName = region.name;
	state.page = 1;
	state.searchTerm = "";
	searchInput.value = "";

	const container = document.getElementById("region-species");
	container.innerHTML = `<p>${i18nInstance.t("loading_species_in_region", { region: i18nInstance.region(region.name) })}</p>`;

	const [, quickListData] = await Promise.all([loadList(), fetchAllSpeciesInRegion(region.id)]);

	lastQuickListRegion = region;
	lastQuickListData = quickListData;

	if (quickListData) {
		renderRegionQuickList(region, quickListData);
	} else {
		container.innerHTML = "";
	}
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

function initLanguageToggle() {
	const langToggle = document.getElementById("lang-toggle");
	const langMenu = document.getElementById("lang-menu");
	const langDisplay = document.getElementById("lang-display");
	const langOptions = document.querySelectorAll(".lang-option");

	// Synchronise le bouton et le menu avec la langue déjà active (ex. restaurée du localStorage).
	langDisplay.textContent = i18nInstance.currentLang.toUpperCase();
	langOptions.forEach(o => o.classList.toggle("active", o.getAttribute("data-lang") === i18nInstance.currentLang));

	langToggle.addEventListener("click", () => {
		const isOpen = langMenu.hidden === false;
		langMenu.hidden = isOpen;
		langToggle.setAttribute("aria-expanded", !isOpen);
	});

	langOptions.forEach((option) => {
		option.addEventListener("click", () => {
			const lang = option.getAttribute("data-lang");
			i18nInstance.setLanguage(lang);

			langDisplay.textContent = lang.toUpperCase();
			langOptions.forEach(o => o.classList.remove("active"));
			option.classList.add("active");

			langMenu.hidden = true;
			langToggle.setAttribute("aria-expanded", "false");
		});
	});

	document.addEventListener("click", (e) => {
		if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
			langMenu.hidden = true;
			langToggle.setAttribute("aria-expanded", "false");
		}
	});
}

function reRenderOnLanguageChange() {
	renderFilterOptions();

	// Recharge la liste courante (recherche ou filtres) pour retraduire habitat/régime.
	if (state.searchTerm.length >= 2) {
		runSearch(state.searchTerm);
	} else {
		loadList();
	}

	// Rejoue le détail affiché, s'il y en a un, pour retraduire ses champs.
	if (currentDetailId) {
		showDetail(currentDetailId);
	}

	// Retraduit le bandeau d'aide et le libellé des repères du globe.
	document.querySelectorAll(".globe-hint").forEach(hint => {
		hint.textContent = i18nInstance.t("globe_hint");
	});
	document.querySelectorAll(".globe-marker").forEach(marker => {
		const name = marker.getAttribute("data-region-name");
		if (name) marker.setAttribute("aria-label", i18nInstance.t("view_species_in", { region: i18nInstance.region(name) }));
	});

	// Rejoue la mini-liste régionale affichée sous le globe, s'il y en a une.
	if (lastQuickListData) {
		renderRegionQuickList(lastQuickListRegion, lastQuickListData);
	}

	// Recrée les graphiques avec les libellés traduits.
	initDashboard();
}

async function init() {
	initLanguageToggle();
	bindFilterEvents();
	bindBackToTop();
	i18nInstance.subscribe(reRenderOnLanguageChange);
	await populateFilters();
	await loadList();
	await initMap(selectRegion, showDetail);
	await initDashboard();
}

init();
