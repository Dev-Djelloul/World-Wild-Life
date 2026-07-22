import { fetchRegions, fetchRegionSpecies } from "./api-client.js";

// GeoJSON des frontières de pays par continent (Natural Earth, domaine public,
// via click_that_hood). Chargé à la demande au clic sur une région.
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
const WORLD_BOUNDS = [
	[-85, -200],
	[85, 200],
];

let mapInstance = null;
let boundaryLayer = null;
const geojsonCache = new Map();

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

export async function initMap(onRegionSelect) {
	const mapEl = document.getElementById("map");
	if (!mapEl || !window.L) return;

	mapInstance = window.L.map("map", {
		center: [15, 10],
		zoom: 2,
		minZoom: 2,
		maxZoom: 7,
		worldCopyJump: false,
		maxBounds: WORLD_BOUNDS,
		maxBoundsViscosity: 1.0,
		scrollWheelZoom: false,
	});

	mapEl.addEventListener("click", () => mapInstance.scrollWheelZoom.enable());
	mapEl.addEventListener("mouseleave", () => mapInstance.scrollWheelZoom.disable());

	window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution: "&copy; OpenStreetMap contributors",
		maxZoom: 7,
		noWrap: true,
	}).addTo(mapInstance);

	const regions = await fetchRegions();

	regions.forEach(region => {
		if (region.latitude == null || region.longitude == null) return;
		const marker = window.L.marker([region.latitude, region.longitude]).addTo(mapInstance);
		marker.bindPopup(`<strong>${region.name}</strong><br>${region.description || ""}`);
		marker.on("click", async () => {
			mapInstance.setView([region.latitude, region.longitude], 3);

			if (boundaryLayer) {
				mapInstance.removeLayer(boundaryLayer);
				boundaryLayer = null;
			}

			const geojson = await loadRegionBoundary(region.name);
			if (geojson) {
				boundaryLayer = window.L.geoJSON(geojson, {
					style: {
						color: "#1f4d36",
						weight: 1.5,
						fillColor: "#2f6b4a",
						fillOpacity: 0.25,
					},
				}).addTo(mapInstance);
				boundaryLayer.bringToBack();
			}

			const data = await fetchRegionSpecies(region.id, 20);
			onRegionSelect(data);
		});
	});
}
