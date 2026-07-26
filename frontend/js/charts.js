import { fetchStats } from "./api-client.js";
import { i18nInstance } from "./i18n.js";

// Palette UICN océanique : teintes refroidies + bioluminescence
const STATUS_COLORS = {
	LC: "#26d3aa",
	NT: "#4dd0e1",
	VU: "#ffa726",
	EN: "#ff7043",
	CR: "#d63330",
	DD: "#80deea",
};

const TEXT_COLOR = "#e8f4fa";
const MUTED_COLOR = "#b8d4e3";
const GRID_COLOR = "rgba(255, 255, 255, 0.08)";

// Plugin : centre luminescent du donut UICN
const donutCenterPlugin = {
	id: "donutCenter",
	afterDraw(chart) {
		if (chart.config.type !== "doughnut") return;
		const { ctx, chartArea: { left, top, width, height } } = chart;
		const cx = left + width / 2;
		const cy = top + height / 2;
		const r = Math.min(width, height) / 4.2;

		const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
		grd.addColorStop(0, "rgba(95, 227, 192, 0.28)");
		grd.addColorStop(1, "rgba(95, 227, 192, 0)");
		ctx.save();
		ctx.fillStyle = grd;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, 2 * Math.PI);
		ctx.fill();

		const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
		ctx.font = "bold 22px 'Cormorant Garamond', Georgia, serif";
		ctx.fillStyle = "#5fe3c0";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(total, cx, cy - 10);
		ctx.font = "11px 'DM Sans', system-ui, sans-serif";
		ctx.fillStyle = "#b8d4e3";
		ctx.fillText(i18nInstance.t("chart_species_center"), cx, cy + 10);
		ctx.restore();
	},
};

function getStatusLabel(statusCode) {
	return i18nInstance.t(`uicn_status.${statusCode}`);
}

function getStatusDefinition(statusCode) {
	return i18nInstance.t(`uicn_definitions.${statusCode}`) || statusCode;
}

let statusChart = null;
let habitatChart = null;

export async function initDashboard() {
	if (!window.Chart) return;

	window.Chart.defaults.color = MUTED_COLOR;
	window.Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";

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
			labels: statusLabels.map(s => getStatusLabel(s)),
			datasets: [{
				data: statusData,
				backgroundColor: statusLabels.map(s => STATUS_COLORS[s] || "#999"),
				borderColor: "rgba(3, 19, 31, 0.6)",
				borderWidth: 2,
				hoverOffset: 8,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: "62%",
			plugins: {
				legend: {
					position: "bottom",
					labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle", color: TEXT_COLOR, font: { size: 11 }, padding: 12 },
				},
				tooltip: {
					backgroundColor: "rgba(6, 34, 51, 0.95)",
					borderColor: "rgba(95, 227, 192, 0.5)",
					borderWidth: 1,
					titleColor: "#fff",
					bodyColor: MUTED_COLOR,
					padding: 16,
					maxWidth: 520,
					displayColors: false,
					callbacks: {
						title: () => "",
						label: (context) => {
							const statusCode = statusLabels[context.dataIndex];
							const count = context.parsed;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percent = Math.round((count / total) * 100);
							return [
								`${statusCode}: ${count} (${percent}%)`,
								getStatusDefinition(statusCode)
							];
						},
					},
				},
			},
		},
		plugins: [donutCenterPlugin],
	});

	const habitatKeys = Object.keys(stats.by_habitat);
	const habitatLabels = habitatKeys.map(h => i18nInstance.habitat(h));
	const habitatData = habitatKeys.map(h => stats.by_habitat[h]);

	const habitatCtx = document.getElementById("habitat-chart");
	if (habitatChart) habitatChart.destroy();
	habitatChart = new window.Chart(habitatCtx, {
		type: "bar",
		data: {
			labels: habitatLabels,
			datasets: [{
				label: i18nInstance.t("chart_species_dataset_label"),
				data: habitatData,
				backgroundColor: habitatData.map(() => "rgba(95, 227, 192, 0.45)"),
				hoverBackgroundColor: "rgba(95, 227, 192, 0.85)",
				borderRadius: 8,
				borderSkipped: false,
				borderWidth: 0,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: "rgba(6, 34, 51, 0.92)",
					borderColor: "rgba(95, 227, 192, 0.4)",
					borderWidth: 1,
					titleColor: "#fff",
					bodyColor: MUTED_COLOR,
					padding: 10,
					callbacks: {
						afterBody: (items) => {
							const total = habitatData.reduce((a, b) => a + b, 0);
							const pct = Math.round((items[0].parsed.y / total) * 100);
							return `${pct}% du total`;
						},
					},
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					border: { display: false },
					grid: { color: GRID_COLOR },
					ticks: { color: MUTED_COLOR, maxTicksLimit: 6 },
				},
				x: {
					border: { display: false },
					grid: { display: false },
					ticks: { color: MUTED_COLOR, maxRotation: 30 },
				},
			},
		},
	});
}
