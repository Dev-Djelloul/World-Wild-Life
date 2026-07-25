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
		uicn_status: {
			LC: "Préoccupation mineure",
			NT: "Quasi menacée",
			VU: "Vulnérable",
			EN: "En danger",
			CR: "En danger critique",
			DD: "Données insuffisantes",
		},
		footer: "Données de conservation à but éducatif.",
		back_to_top: "Retour en haut de la page",
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
		uicn_status: {
			LC: "Least Concern",
			NT: "Near Threatened",
			VU: "Vulnerable",
			EN: "Endangered",
			CR: "Critically Endangered",
			DD: "Data Deficient",
		},
		footer: "Conservation data for educational purposes.",
		back_to_top: "Back to top",
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
		uicn_status: {
			LC: "Preocupación Menor",
			NT: "Casi Amenazada",
			VU: "Vulnerable",
			EN: "Peligro",
			CR: "Peligro Crítico",
			DD: "Datos Insuficientes",
		},
		footer: "Datos de conservación con fines educativos.",
		back_to_top: "Volver al inicio",
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

	t(key) {
		const keys = key.split(".");
		let value = translations[this.currentLang];
		for (const k of keys) {
			value = value[k];
			if (!value) return key;
		}
		return value;
	}

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
			el.textContent = this.t(key);
		});
		document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
			const key = el.getAttribute("data-i18n-placeholder");
			el.placeholder = this.t(key);
		});
	}
}

export const i18nInstance = new i18n();
