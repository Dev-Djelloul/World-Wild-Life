import { fetchRegions, fetchRegionSpecies } from "./api-client.js";

let mapInstance = null;

export async function initMap(onRegionSelect) {
	const mapEl = document.getElementById("map");
	if (!mapEl || !window.L) return;

	mapInstance = window.L.map("map").setView([10, 20], 2);

	window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution: "&copy; OpenStreetMap contributors",
		maxZoom: 8,
	}).addTo(mapInstance);

	const regions = await fetchRegions();

	regions.forEach(region => {
		if (region.latitude == null || region.longitude == null) return;
		const marker = window.L.marker([region.latitude, region.longitude]).addTo(mapInstance);
		marker.bindPopup(`<strong>${region.name}</strong><br>${region.description || ""}`);
		marker.on("click", async () => {
			mapInstance.setView([region.latitude, region.longitude], 4);
			const data = await fetchRegionSpecies(region.id, 20);
			onRegionSelect(data);
		});
	});
}
