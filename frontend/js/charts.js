import { fetchStats } from "./api-client.js";

// Palette UICN éclaircie pour rester lisible sur le fond océan sombre
// (identique aux badges .status-* de la feuille de style).
const STATUS_COLORS = {
	LC: "#6ede8a",
	NT: "#b5e26a",
	VU: "#f5c85c",
	EN: "#f79b5c",
	CR: "#f5705f",
	DD: "#b8c4c9",
};

const TEXT_COLOR = "#e8f4fa";
const MUTED_COLOR = "#9fc2d4";
const GRID_COLOR = "rgba(255, 255, 255, 0.10)";

const STATUS_LABELS = {
	LC: "Préoccupation mineure",
	NT: "Quasi menacée",
	VU: "Vulnérable",
	EN: "En danger",
	CR: "En danger critique",
	DD: "Données insuffisantes",
};

let statusChart = null;
let habitatChart = null;

export async function initDashboard() {
	if (!window.Chart) return;

	window.Chart.defaults.color = MUTED_COLOR;
	window.Chart.defaults.font.family = "'Work Sans', system-ui, sans-serif";

	const stats = await fetchStats();

	document.getElementById("kpi-total").textContent = stats.total_species;
	document.getElementById("kpi-threatened").textContent =
		(stats.by_status.VU || 0) + (stats.by_status.EN || 0) + (stats.by_status.CR || 0);
	document.getElementById("kpi-habitats").textContent = Object.keys(stats.by_habitat).length;

	const statusOrder = ["LC", "NT", "VU", "EN", "CR", "DD"];
	const statusLabels = statusOrder.filter(s => stats.by_status[s] !== undefined);
	const statusData = statusLabels.map(s => stats.by_status[s]);

	const statusCtx = document.getElementById("status-chart");
	if (statusChart) statusChart.destroy();
	statusChart = new window.Chart(statusCtx, {
		type: "doughnut",
		data: {
			labels: statusLabels.map(s => STATUS_LABELS[s] || s),
			datasets: [{
				data: statusData,
				backgroundColor: statusLabels.map(s => STATUS_COLORS[s] || "#999"),
				borderColor: "rgba(6, 47, 71, 0.55)",
				borderWidth: 2,
				hoverOffset: 6,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: "62%",
			plugins: {
				legend: {
					position: "bottom",
					labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: "circle", color: TEXT_COLOR, font: { size: 11 }, padding: 14 },
				},
			},
		},
	});

	const habitatLabels = Object.keys(stats.by_habitat);
	const habitatData = habitatLabels.map(h => stats.by_habitat[h]);

	const habitatCtx = document.getElementById("habitat-chart");
	if (habitatChart) habitatChart.destroy();
	habitatChart = new window.Chart(habitatCtx, {
		type: "bar",
		data: {
			labels: habitatLabels,
			datasets: [{
				label: "Nombre d'espèces",
				data: habitatData,
				backgroundColor: "rgba(95, 227, 192, 0.55)",
				hoverBackgroundColor: "rgba(95, 227, 192, 0.8)",
				borderRadius: 6,
				borderSkipped: false,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				y: {
					beginAtZero: true,
					grid: { color: GRID_COLOR, drawBorder: false },
					ticks: { color: MUTED_COLOR },
				},
				x: {
					grid: { display: false },
					ticks: { color: MUTED_COLOR },
				},
			},
		},
	});
}
