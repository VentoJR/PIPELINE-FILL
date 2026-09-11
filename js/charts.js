/* ============================================================================
   VENTO DASHBOARD — charts.js
   Renderizado de gráficas (Chart.js) y gauges de capacidad.
   ============================================================================ */

const CH = {
  primary: "#E8720C",       // naranja corporativo (detalles/series principales de gráficas)
  primaryLight: "#F2934A",
  success: "#1E8E5A",       // SIN CAMBIOS — mismos colores de indicador que el resto del dashboard
  warning: "#B9820A",
  danger: "#C0392B",
  neutral: "#C7CBD1",
  grid: "#EDEEF1",
};

let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.color = "#6B7280";

/* ----------------------------------------------------------------------
   Gráfica combinada: Proyectado vs Cumplido (barras) + % acumulado (línea)
   ---------------------------------------------------------------------- */
function renderWeeklyChart(weeklyRows) {
  destroyChart("weekly");
  const ctx = document.getElementById("chartSemanal").getContext("2d");

  const labels = weeklyRows.map(w => `Semana ${w.week}`);
  const proyectadoArr = weeklyRows.map(w => w.proyectado);
  const cumplidoArr = weeklyRows.map(w => w.cumplido);
  const pctAcumuladoArr = weeklyRows.map(w => w.pctAcumulado !== null ? +(w.pctAcumulado * 100).toFixed(1) : null);

  chartInstances.weekly = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        { type: "bar", label: "Proyectado", data: proyectadoArr, backgroundColor: CH.neutral, borderRadius: 3, yAxisID: "y" },
        { type: "bar", label: "Cumplido", data: cumplidoArr, backgroundColor: CH.primary, borderRadius: 3, yAxisID: "y" },
        { type: "line", label: "% Cumplimiento Acumulado", data: pctAcumuladoArr, borderColor: CH.warning, backgroundColor: CH.warning, tension: 0.3, yAxisID: "y1", spanGaps: true, pointRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: CH.grid }, beginAtZero: true, title: { display: true, text: "Unidades" } },
        y1: { position: "right", grid: { display: false }, min: 0, suggestedMax: 120, title: { display: true, text: "% Acumulado" }, ticks: { callback: v => v + "%" } },
      },
    },
  });
}

/* ----------------------------------------------------------------------
   Gráfica de modelos pendientes por entregar (horizontal)
   ---------------------------------------------------------------------- */
function renderPendientesChart(pendientesRows, topN) {
  destroyChart("pendientes");
  const rows = topN === "ALL" ? pendientesRows : pendientesRows.slice(0, parseInt(topN, 10));
  const ctx = document.getElementById("chartPendientes").getContext("2d");
  chartInstances.pendientes = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map(r => r.modelo),
      datasets: [{ label: "Pendiente por entregar", data: rows.map(r => r.pendienteCalc), backgroundColor: CH.primary, borderRadius: 3 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CH.grid }, beginAtZero: true },
        y: { grid: { display: false } },
      },
    },
  });
}

/* ----------------------------------------------------------------------
   GAUGE tipo velocímetro (doughnut semicircular con Chart.js)
   ---------------------------------------------------------------------- */
function gaugeColor(level) {
  if (level === "overload") return CH.danger;
  if (level === "danger") return CH.danger;
  if (level === "warning") return CH.warning;
  return CH.success;
}

function renderGauge(canvasId, capacityObj) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  const pct = capacityObj.pct === null ? 0 : Math.min(capacityObj.pct, 1.2); // recorte visual a 120%
  const filled = Math.min(pct, 1) * 100;
  const overflow = Math.max(pct - 1, 0) * 100;
  const remaining = Math.max(100 - filled - overflow, 0);
  const color = gaugeColor(capacityObj.level);

  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [filled, overflow, remaining],
        backgroundColor: [color, CH.danger, "#E9ECF2"],
        borderWidth: 0,
      }],
    },
    options: {
      circumference: 180, rotation: 270, cutout: "72%",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

function renderAllGauges(capacity) {
  renderGauge("gaugeEcommerce", capacity.ecommerce);
  renderGauge("gaugeDistribuidores", capacity.distribuidores);
  renderGauge("gaugeTotal", capacity.total);

  fillGaugeText("gaugeEcommerceText", capacity.ecommerce);
  fillGaugeText("gaugeDistribuidoresText", capacity.distribuidores);
  fillGaugeText("gaugeTotalText", capacity.total);
}

function fillGaugeText(id, cap) {
  const el = document.getElementById(id);
  const pctLabel = cap.pct === null ? "N/A" : formatPercent(cap.pct);
  const overloadNote = cap.level === "overload" ? `<div class="badge badge-danger" style="margin-top:6px;">SOBRECARGA +${formatNumber(cap.overload)}</div>` : "";
  el.innerHTML = `
    <div class="gauge-value">${pctLabel}</div>
    <div class="gauge-sub">${formatNumber(cap.used)} / ${formatNumber(cap.capacity)} unidades</div>
    ${overloadNote}
  `;
}
