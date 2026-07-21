import { fetchStats } from "./api-client.js";

const STATUS_COLORS = {
	LC: "#4caf50",
	NT: "#8bc34a",
	VU: "#ffc107",
	EN: "#ff9800",
	CR: "#e53935",
};

const STATUS_LABELS = {
	LC: "Préoccupation mineure",
	NT: "Quasi menacée",
	VU: "Vulnérable",
	EN: "En danger",
	CR: "En danger critique",
};

let statusChart = null;
let habitatChart = null;

export async function initDashboard() {
	if (!window.Chart) return;

	const stats = await fetchStats();

	document.getElementById("kpi-total").textContent = stats.total_species;
	document.getElementById("kpi-threatened").textContent =
		(stats.by_status.VU || 0) + (stats.by_status.EN || 0) + (stats.by_status.CR || 0);
	document.getElementById("kpi-habitats").textContent = Object.keys(stats.by_habitat).length;

	const statusOrder = ["LC", "NT", "VU", "EN", "CR"];
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
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { position: "bottom", labels: { boxWidth: 14, font: { size: 11 } } } },
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
				backgroundColor: "#2f5d3a",
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { beginAtZero: true } },
		},
	});
}
