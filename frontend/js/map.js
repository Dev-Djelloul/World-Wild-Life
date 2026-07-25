import { fetchRegions } from "./api-client.js";
import { i18nInstance } from "./i18n.js";

// GeoJSON des frontières de pays par continent (Natural Earth, domaine public,
// via click_that_hood). Chargé à la demande pour surligner la région sélectionnée.
const GEOJSON_BY_REGION = {
	"Afrique": "africa",
	"Amérique du Sud": "south-america",
	"Amérique du Nord": "north-america",
	"Asie": "asia",
	"Europe": "europe",
	"Océanie": "oceania",
	// Antarctique et Océans mondiaux : pas de polygone continental pertinent, marqueur seul.
};

const GEOJSON_BASE_URL = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data";
const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

const ROTATION_SENSITIVITY = 75; // degrés de rotation par pixel, rapporté à l'échelle
const AUTO_ROTATE_SPEED = 4; // degrés/seconde, avant la première interaction
const MIN_SCALE_RATIO = 0.9;
const MAX_SCALE_RATIO = 3;

const geojsonCache = new Map();
let landFeature = null;

async function loadRegionBoundary(regionName) {
	const slug = GEOJSON_BY_REGION[regionName];
	if (!slug) return null;
	if (geojsonCache.has(slug)) return geojsonCache.get(slug);

	const res = await fetch(`${GEOJSON_BASE_URL}/${slug}.geojson`);
	if (!res.ok) return null;
	const data = await res.json();
	geojsonCache.set(slug, data);
	return data;
}

async function loadLand() {
	if (landFeature) return landFeature;
	const res = await fetch(LAND_URL);
	if (!res.ok) return null;
	const topology = await res.json();
	landFeature = window.topojson.feature(topology, topology.objects.land);
	return landFeature;
}

export async function initMap(onRegionSelect) {
	const mapEl = document.getElementById("map");
	if (!mapEl || !window.d3 || !window.topojson) return;

	const d3 = window.d3;
	const regions = await fetchRegions();
	const land = await loadLand();

	mapEl.innerHTML = "";

	const tooltip = document.createElement("div");
	tooltip.className = "globe-tooltip";
	tooltip.setAttribute("role", "status");
	mapEl.appendChild(tooltip);

	const hint = document.createElement("p");
	hint.className = "globe-hint";
	hint.textContent = i18nInstance.t("globe_hint");
	mapEl.appendChild(hint);

	const svg = d3.select(mapEl).append("svg").attr("class", "globe-svg");
	const defs = svg.append("defs");

	const oceanGradient = defs.append("radialGradient")
		.attr("id", "globe-ocean")
		.attr("cx", "35%").attr("cy", "30%").attr("r", "80%");
	oceanGradient.append("stop").attr("offset", "0%").attr("stop-color", "#9fd8ea");
	oceanGradient.append("stop").attr("offset", "55%").attr("stop-color", "#4d9fc4");
	oceanGradient.append("stop").attr("offset", "100%").attr("stop-color", "#14536f");

	// Ombrage sur le limbe pour donner du volume à la sphère.
	const shadeGradient = defs.append("radialGradient")
		.attr("id", "globe-shade")
		.attr("cx", "35%").attr("cy", "30%").attr("r", "78%");
	shadeGradient.append("stop").attr("offset", "62%").attr("stop-color", "rgba(0,0,0,0)");
	shadeGradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(3, 19, 31, 0.62)");

	const glow = defs.append("filter").attr("id", "globe-glow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
	glow.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
	const glowMerge = glow.append("feMerge");
	glowMerge.append("feMergeNode").attr("in", "blur");
	glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

	const projection = d3.geoOrthographic().clipAngle(90).rotate([-10, -15, 0]);
	const path = d3.geoPath(projection);
	const graticule = d3.geoGraticule10();

	const g = svg.append("g");
	const haloPath = g.append("circle").attr("class", "globe-halo").attr("filter", "url(#globe-glow)");
	const spherePath = g.append("path").attr("class", "globe-sphere").attr("fill", "url(#globe-ocean)");
	const graticulePath = g.append("path").attr("class", "globe-graticule");
	const landPath = g.append("path").attr("class", "globe-land");
	const highlightPath = g.append("path").attr("class", "globe-highlight");
	const shadePath = g.append("path").attr("class", "globe-shade").attr("fill", "url(#globe-shade)");
	const markerGroup = g.append("g").attr("class", "globe-markers");

	let width = 0;
	let height = 0;
	let baseScale = 0;
	let zoomRatio = 1; // facteur de zoom utilisateur, appliqué par-dessus baseScale
	let selectedRegionId = null;
	let highlightGeojson = null;
	let interacted = false;
	let autoRotateTimer = null;

	function sizeToContainer() {
		const rect = mapEl.getBoundingClientRect();
		// Ignore les mesures prises pendant que la mise en page n'est pas stabilisée :
		// sans ce garde-fou, le globe se retrouve calculé à quelques pixels.
		if (rect.width < 80 || rect.height < 80) return false;

		width = rect.width;
		height = rect.height;

		// Réserve la hauteur réelle du bandeau d'aide (il passe sur 2-3 lignes en
		// mobile) pour que le globe ne soit jamais recouvert.
		const reserved = hint.offsetHeight + 20;
		const usableHeight = Math.max(140, height - reserved);
		const centerY = usableHeight / 2;
		baseScale = Math.min(width, usableHeight) / 2 - 12;

		svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);
		projection.translate([width / 2, centerY]).scale(baseScale * zoomRatio);
		haloPath.attr("cx", width / 2).attr("cy", centerY);
		return true;
	}

	function markerVisible(region) {
		const r = projection.rotate();
		return d3.geoDistance([region.longitude, region.latitude], [-r[0], -r[1]]) < Math.PI / 2;
	}

	function render() {
		const sphere = { type: "Sphere" };
		spherePath.attr("d", path(sphere));
		shadePath.attr("d", path(sphere));
		haloPath.attr("r", projection.scale());
		graticulePath.attr("d", path(graticule));
		if (land) landPath.attr("d", path(land));
		highlightPath.attr("d", highlightGeojson ? path(highlightGeojson) : null);

		markerGroup.selectAll("g.globe-marker")
			.attr("transform", d => {
				const p = projection([d.longitude, d.latitude]);
				return p ? `translate(${p[0]}, ${p[1]})` : null;
			})
			.attr("display", d => (markerVisible(d) ? null : "none"))
			.classed("is-selected", d => d.id === selectedRegionId);
	}

	function showTooltip(region) {
		const p = projection([region.longitude, region.latitude]);
		if (!p) return;
		tooltip.innerHTML = `<strong>${i18nInstance.region(region.name)}</strong>${region.description ? `<span>${region.description}</span>` : ""}`;
		tooltip.classList.add("is-visible");

		// Positionne l'infobulle en la contraignant dans le cadre : c'est ce qui
		// empêche le texte d'être coupé quand un repère est près d'un bord.
		const tw = tooltip.offsetWidth;
		const th = tooltip.offsetHeight;
		const margin = 8;
		let left = p[0] - tw / 2;
		let top = p[1] - th - 18;
		left = Math.max(margin, Math.min(left, width - tw - margin));
		if (top < margin) top = p[1] + 18;
		top = Math.max(margin, Math.min(top, height - th - margin));
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	function hideTooltip() {
		tooltip.classList.remove("is-visible");
	}

	function stopAutoRotation() {
		if (interacted) return;
		interacted = true;
		autoRotateTimer?.stop();
		hint.classList.add("is-faded");
	}

	function rotateTo(region, onDone) {
		const start = projection.rotate();
		const end = [-region.longitude, -region.latitude, 0];
		d3.transition()
			.duration(900)
			.tween("rotate", () => {
				const interpolate = d3.interpolate(start, end);
				return t => {
					projection.rotate(interpolate(t));
					render();
				};
			})
			.on("end", () => onDone?.());
	}

	async function selectRegion(region) {
		stopAutoRotation();
		selectedRegionId = region.id;
		hideTooltip();

		highlightGeojson = await loadRegionBoundary(region.name);
		rotateTo(region);
		render();

		onRegionSelect({ id: region.id, name: region.name });
	}

	const markers = markerGroup.selectAll("g.globe-marker")
		.data(regions.filter(r => r.latitude != null && r.longitude != null))
		.join("g")
		.attr("class", "globe-marker")
		.attr("tabindex", 0)
		.attr("role", "button")
		.attr("data-region-name", d => d.name)
		.attr("aria-label", d => i18nInstance.t("view_species_in", { region: i18nInstance.region(d.name) }));

	markers.append("circle").attr("class", "globe-marker-pulse").attr("r", 13);
	markers.append("circle").attr("class", "globe-marker-dot").attr("r", 6);

	markers
		.on("mouseenter", (event, d) => showTooltip(d))
		.on("mouseleave", hideTooltip)
		.on("focus", (event, d) => showTooltip(d))
		.on("blur", hideTooltip)
		.on("click", (event, d) => selectRegion(d))
		.on("keydown", (event, d) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				selectRegion(d);
			}
		});

	const drag = d3.drag()
		.on("start", () => {
			stopAutoRotation();
			hideTooltip();
			mapEl.classList.add("is-dragging");
		})
		.on("drag", (event) => {
			const rotate = projection.rotate();
			const k = ROTATION_SENSITIVITY / projection.scale();
			projection.rotate([
				rotate[0] + event.dx * k,
				// Bloque la latitude pour éviter que le globe ne bascule à l'envers.
				Math.max(-90, Math.min(90, rotate[1] - event.dy * k)),
			]);
			render();
		})
		.on("end", () => mapEl.classList.remove("is-dragging"));

	const zoom = d3.zoom()
		.scaleExtent([MIN_SCALE_RATIO, MAX_SCALE_RATIO])
		.filter(event => event.type === "wheel" ? event.ctrlKey || event.metaKey : true)
		.on("zoom", (event) => {
			if (event.sourceEvent) stopAutoRotation();
			zoomRatio = event.transform.k;
			projection.scale(baseScale * zoomRatio);
			render();
		});

	svg.call(drag).call(zoom).on("dblclick.zoom", null);

	sizeToContainer();
	render();

	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (!prefersReducedMotion) {
		let last = 0;
		// La référence est indispensable : un timer d3 ne s'arrête qu'avec .stop(),
		// la valeur de retour du callback est ignorée.
		autoRotateTimer = d3.timer((elapsed) => {
			const delta = elapsed - last;
			last = elapsed;
			const rotate = projection.rotate();
			projection.rotate([rotate[0] + (AUTO_ROTATE_SPEED * delta) / 1000, rotate[1]]);
			render();
		});
	}

	// sizeToContainer() est idempotent : les deux sources peuvent se déclencher sans dommage.
	// L'événement window couvre le redimensionnement de la fenêtre ; le ResizeObserver,
	// quand il est disponible, capte aussi les changements de largeur du conteneur seul.
	const handleResize = () => {
		if (sizeToContainer()) render();
	};

	window.addEventListener("resize", handleResize);
	if (typeof ResizeObserver !== "undefined") {
		new ResizeObserver(handleResize).observe(mapEl);
	}
}
