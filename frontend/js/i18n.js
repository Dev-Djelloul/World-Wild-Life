const translations = {
	fr: {
		tagline: "Découvrez la richesse du vivant. Explorez chaque espèce, son monde, sa survie.",
		language: "Langue",
		dashboard: "Aperçu global",
		species_count: "Espèces référencées",
		threatened_species: "Espèces menacées",
		habitats: "Habitats couverts",
		uicn_distribution: "Répartition par statut UICN",
		species_by_habitat: "Espèces par habitat",
		map_section: "Carte des régions",
		explorer: "Explorer les espèces",
		search_placeholder: "Rechercher une espèce (min. 2 caractères)...",
		all_habitats: "Tous les habitats",
		all_diets: "Tous les régimes",
		all_status: "Tous les statuts",
		results_info: "Résultats",
		footer: "Données de conservation à but éducatif.",
		back_to_top: "Retour en haut de la page",

		loading: "Chargement…",
		no_species_match: "Aucune espèce ne correspond à ces critères.",
		api_unreachable: "Impossible de charger les espèces. L'API backend est-elle accessible ?",
		search_error: "Erreur lors de la recherche.",
		species_found: "{n} espèce(s) trouvée(s)",
		species_found_in_region: "{n} espèce(s) trouvée(s) en {region}",
		remove_region_filter: "✕ retirer le filtre régional",
		results_for: "{n} résultat(s) pour « {term} »",
		prev: "← Précédent",
		next: "Suivant →",
		page_of: "Page {page} / {pages}",

		iucn_status_label: "Statut UICN",
		habitat_label: "Habitat :",
		diet_label: "Régime :",
		trend_label: "Tendance :",
		regions_label: "Régions :",
		not_specified: "Non renseigné",
		detail_load_error: "Impossible de charger les détails de cette espèce.",

		iucn_live_status: "Statut IUCN en direct",
		assessed_in: "Évalué en {year}",
		view_assessment: "voir l'évaluation",
		taxonomy_title: "Taxonomie (NCBI)",
		learn_more: "En savoir plus",
		iucn_status_wikidata: "Statut IUCN (Wikidata)",
		more_photos: "Plus de photos (Pexels)",
		photo_by: "Photo par {name}",

		species_in_region: "Espèces en {region} ({count})",
		loading_species_in_region: "Chargement des espèces en {region}…",
		view_species_in: "Voir les espèces en {region}",
		globe_hint: "Faites glisser pour tourner le globe · cliquez sur un repère",

		chart_species_center: "espèces",
		chart_species_dataset_label: "Nombre d'espèces",
		chart_pct_of_total: "{pct}% du total",

		uicn_status: {
			LC: "Préoccupation mineure",
			NT: "Quasi menacée",
			VU: "Vulnérable",
			EN: "En danger",
			CR: "En danger critique",
			DD: "Données insuffisantes",
		},
		habitat_names: {
			"Désert": "Désert",
			"Forêt tempérée": "Forêt tempérée",
			"Forêt tropicale": "Forêt tropicale",
			"Montagne": "Montagne",
			"Océan": "Océan",
			"Savane": "Savane",
			"Toundra": "Toundra",
		},
		diet_names: {
			"Carnivore": "Carnivore",
			"Herbivore": "Herbivore",
			"Omnivore": "Omnivore",
		},
		trend_names: {
			"Increasing": "En hausse",
			"Decreasing": "En déclin",
			"Stable": "Stable",
			"Unknown": "Inconnue",
		},
		presence_names: {
			"Resident": "Résidente",
			"Migratory": "Migratrice",
		},
		region_names: {
			"Afrique": "Afrique",
			"Amérique du Sud": "Amérique du Sud",
			"Amérique du Nord": "Amérique du Nord",
			"Asie": "Asie",
			"Europe": "Europe",
			"Océanie": "Océanie",
			"Antarctique": "Antarctique",
			"Océans mondiaux": "Océans mondiaux",
		},
	},
	en: {
		tagline: "Discover life's diversity. Explore each species, its habitat, its survival.",
		language: "Language",
		dashboard: "Global Overview",
		species_count: "Species Listed",
		threatened_species: "Threatened Species",
		habitats: "Habitats Covered",
		uicn_distribution: "Distribution by IUCN Status",
		species_by_habitat: "Species per Habitat",
		map_section: "Regional Map",
		explorer: "Explore Species",
		search_placeholder: "Search for a species (min. 2 characters)...",
		all_habitats: "All Habitats",
		all_diets: "All Diets",
		all_status: "All Status",
		results_info: "Results",
		footer: "Conservation data for educational purposes.",
		back_to_top: "Back to top",

		loading: "Loading…",
		no_species_match: "No species match these criteria.",
		api_unreachable: "Unable to load species. Is the backend API reachable?",
		search_error: "Error during search.",
		species_found: "{n} species found",
		species_found_in_region: "{n} species found in {region}",
		remove_region_filter: "✕ remove regional filter",
		results_for: '{n} result(s) for "{term}"',
		prev: "← Previous",
		next: "Next →",
		page_of: "Page {page} / {pages}",

		iucn_status_label: "IUCN Status",
		habitat_label: "Habitat:",
		diet_label: "Diet:",
		trend_label: "Trend:",
		regions_label: "Regions:",
		not_specified: "Not specified",
		detail_load_error: "Unable to load details for this species.",

		iucn_live_status: "Live IUCN Status",
		assessed_in: "Assessed in {year}",
		view_assessment: "view assessment",
		taxonomy_title: "Taxonomy (NCBI)",
		learn_more: "Learn More",
		iucn_status_wikidata: "IUCN Status (Wikidata)",
		more_photos: "More Photos (Pexels)",
		photo_by: "Photo by {name}",

		species_in_region: "Species in {region} ({count})",
		loading_species_in_region: "Loading species in {region}…",
		view_species_in: "View species in {region}",
		globe_hint: "Drag to rotate the globe · click a marker",

		chart_species_center: "species",
		chart_species_dataset_label: "Number of species",
		chart_pct_of_total: "{pct}% of total",

		uicn_status: {
			LC: "Least Concern",
			NT: "Near Threatened",
			VU: "Vulnerable",
			EN: "Endangered",
			CR: "Critically Endangered",
			DD: "Data Deficient",
		},
		habitat_names: {
			"Désert": "Desert",
			"Forêt tempérée": "Temperate Forest",
			"Forêt tropicale": "Tropical Forest",
			"Montagne": "Mountain",
			"Océan": "Ocean",
			"Savane": "Savanna",
			"Toundra": "Tundra",
		},
		diet_names: {
			"Carnivore": "Carnivore",
			"Herbivore": "Herbivore",
			"Omnivore": "Omnivore",
		},
		trend_names: {
			"Increasing": "Increasing",
			"Decreasing": "Decreasing",
			"Stable": "Stable",
			"Unknown": "Unknown",
		},
		presence_names: {
			"Resident": "Resident",
			"Migratory": "Migratory",
		},
		region_names: {
			"Afrique": "Africa",
			"Amérique du Sud": "South America",
			"Amérique du Nord": "North America",
			"Asie": "Asia",
			"Europe": "Europe",
			"Océanie": "Oceania",
			"Antarctique": "Antarctica",
			"Océans mondiaux": "World Oceans",
		},
	},
	es: {
		tagline: "Descubre la riqueza de la vida. Explora cada especie, su hábitat, su supervivencia.",
		language: "Idioma",
		dashboard: "Descripción General",
		species_count: "Especies Enumeradas",
		threatened_species: "Especies Amenazadas",
		habitats: "Hábitats Cubiertos",
		uicn_distribution: "Distribución por Estado UICN",
		species_by_habitat: "Especies por Hábitat",
		map_section: "Mapa Regional",
		explorer: "Explorar Especies",
		search_placeholder: "Buscar una especie (mín. 2 caracteres)...",
		all_habitats: "Todos los Hábitats",
		all_diets: "Todas las Dietas",
		all_status: "Todos los Estados",
		results_info: "Resultados",
		footer: "Datos de conservación con fines educativos.",
		back_to_top: "Volver al inicio",

		loading: "Cargando…",
		no_species_match: "Ninguna especie coincide con estos criterios.",
		api_unreachable: "No se pudieron cargar las especies. ¿Está disponible la API del backend?",
		search_error: "Error durante la búsqueda.",
		species_found: "{n} especie(s) encontrada(s)",
		species_found_in_region: "{n} especie(s) encontrada(s) en {region}",
		remove_region_filter: "✕ quitar el filtro regional",
		results_for: '{n} resultado(s) para "{term}"',
		prev: "← Anterior",
		next: "Siguiente →",
		page_of: "Página {page} / {pages}",

		iucn_status_label: "Estado UICN",
		habitat_label: "Hábitat:",
		diet_label: "Dieta:",
		trend_label: "Tendencia:",
		regions_label: "Regiones:",
		not_specified: "No especificado",
		detail_load_error: "No se pudieron cargar los detalles de esta especie.",

		iucn_live_status: "Estado UICN en Vivo",
		assessed_in: "Evaluado en {year}",
		view_assessment: "ver la evaluación",
		taxonomy_title: "Taxonomía (NCBI)",
		learn_more: "Saber Más",
		iucn_status_wikidata: "Estado UICN (Wikidata)",
		more_photos: "Más Fotos (Pexels)",
		photo_by: "Foto por {name}",

		species_in_region: "Especies en {region} ({count})",
		loading_species_in_region: "Cargando especies en {region}…",
		view_species_in: "Ver especies en {region}",
		globe_hint: "Arrastra para girar el globo · haz clic en un marcador",

		chart_species_center: "especies",
		chart_species_dataset_label: "Número de especies",
		chart_pct_of_total: "{pct}% del total",

		uicn_status: {
			LC: "Preocupación Menor",
			NT: "Casi Amenazada",
			VU: "Vulnerable",
			EN: "Peligro",
			CR: "Peligro Crítico",
			DD: "Datos Insuficientes",
		},
		habitat_names: {
			"Désert": "Desierto",
			"Forêt tempérée": "Bosque Templado",
			"Forêt tropicale": "Bosque Tropical",
			"Montagne": "Montaña",
			"Océan": "Océano",
			"Savane": "Sabana",
			"Toundra": "Tundra",
		},
		diet_names: {
			"Carnivore": "Carnívoro",
			"Herbivore": "Herbívoro",
			"Omnivore": "Omnívoro",
		},
		trend_names: {
			"Increasing": "En Aumento",
			"Decreasing": "En Declive",
			"Stable": "Estable",
			"Unknown": "Desconocida",
		},
		presence_names: {
			"Resident": "Residente",
			"Migratory": "Migratoria",
		},
		region_names: {
			"Afrique": "África",
			"Amérique du Sud": "América del Sur",
			"Amérique du Nord": "América del Norte",
			"Asie": "Asia",
			"Europe": "Europa",
			"Océanie": "Oceanía",
			"Antarctique": "Antártida",
			"Océans mondiaux": "Océanos del Mundo",
		},
	},
};

class i18n {
	constructor() {
		this.currentLang = this.getStoredLang() || this.detectLanguage();
		this.listeners = [];
		this.updateDOM();
	}

	getStoredLang() {
		return localStorage.getItem("wwl-lang");
	}

	detectLanguage() {
		const browserLang = navigator.language.split("-")[0];
		return translations[browserLang] ? browserLang : "fr";
	}

	setLanguage(lang) {
		if (!translations[lang]) return;
		this.currentLang = lang;
		localStorage.setItem("wwl-lang", lang);
		this.updateDOM();
		this.notifyListeners();
	}

	t(key, vars) {
		const keys = key.split(".");
		let value = translations[this.currentLang];
		for (const k of keys) {
			value = value?.[k];
			if (value === undefined) return key;
		}
		if (vars) {
			return Object.entries(vars).reduce(
				(str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), v),
				value
			);
		}
		return value;
	}

	/** Traduit une valeur d'énumération venant du backend (habitat, régime, tendance, présence, région). */
	translateEnum(dictName, value) {
		if (!value) return value;
		const dict = translations[this.currentLang]?.[dictName];
		return dict?.[value] ?? value;
	}

	habitat(value) { return this.translateEnum("habitat_names", value); }
	diet(value) { return this.translateEnum("diet_names", value); }
	trend(value) { return this.translateEnum("trend_names", value); }
	presence(value) { return this.translateEnum("presence_names", value); }
	region(value) { return this.translateEnum("region_names", value); }

	subscribe(callback) {
		this.listeners.push(callback);
	}

	notifyListeners() {
		this.listeners.forEach(cb => cb());
	}

	updateDOM() {
		document.documentElement.lang = this.currentLang;
		document.querySelectorAll("[data-i18n]").forEach(el => {
			const key = el.getAttribute("data-i18n");
			// Si l'élément a des enfants, mettre à jour seulement le nœud texte direct
			const hasChildren = el.children.length > 0;
			if (hasChildren) {
				let textNode = Array.from(el.childNodes).find(node => node.nodeType === 3);
				if (!textNode) {
					textNode = document.createTextNode(this.t(key));
					el.insertBefore(textNode, el.firstChild);
				} else {
					textNode.textContent = this.t(key);
				}
			} else {
				el.textContent = this.t(key);
			}
		});
		document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
			const key = el.getAttribute("data-i18n-placeholder");
			el.placeholder = this.t(key);
		});
	}
}

export const i18nInstance = new i18n();
