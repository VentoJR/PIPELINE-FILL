/* ============================================================================
   VENTO DASHBOARD — dashboard.js
   Actualiza visualmente tarjetas, tablas, gauges y texto a partir de los
   datos ya filtrados y calculados.
   ============================================================================ */

let SORT_MATRIZ = { field: "pendienteCalc", dir: "desc" };

function updateDashboard() {
  const filtered = applyFilters(APP_STATE.data);
  const weeklyRows = calculateWeeklyFulfillment(filtered, APP_STATE.weeksAvailable, APP_STATE.tieneProyeccionSemanal);
  const capacity = calculateCapacity(filtered);
  const fulfillment = calculateFulfillment(filtered);

  renderKPIs(fulfillment);
  renderForecastSection(fulfillment);
  renderWeeklyTable(weeklyRows, APP_STATE.tieneProyeccionSemanal);
  renderWeeklyChart(weeklyRows);
  renderAccumulatedCard(weeklyRows);
  renderCapacity(capacity);
  renderDOH(filtered);
  renderPendientes(filtered);
  renderMatriz(filtered);
  renderAlerts(filtered, weeklyRows, capacity);
  renderExecutiveSummary(filtered, weeklyRows, capacity);

  document.getElementById("canalActivo").textContent =
    FilterState.canal === "TODAS" ? "Vista consolidada — todos los canales" : `Vista filtrada — ${FilterState.canal}`;
}

/* ---------------------------------------------------------------------- */
function renderKPIs(f) {
  document.getElementById("kpiForecast").textContent = formatNumber(f.forecast);
  document.getElementById("kpiPedido").textContent = formatNumber(f.pedidoRevisado);
  document.getElementById("kpiCumplido").textContent = formatNumber(f.inventarioCumplido);
  document.getElementById("kpiPendiente").textContent = formatNumber(Math.max(f.pendiente, 0));
  document.getElementById("kpiTraslado").textContent = formatNumber(f.trasladoCompletado);

  document.getElementById("kpiInventarioTotalProyectado").textContent = formatNumber(f.inventarioTotalProyectado);
  document.getElementById("kpiPctAvancePipeline").textContent =
    `Pedido Revisado: ${formatPercent(f.pctAvancePipeline)} del total proyectado`;

  const pctEl = document.getElementById("kpiPctCumplimiento");
  const pctCard = document.getElementById("kpiPctCumplimientoCard");
  const pctBar = document.getElementById("kpiPctCumplimientoBarra");
  const sem = pctSemaphore(f.pctCumplimiento);
  pctEl.textContent = formatPercent(f.pctCumplimiento);
  pctCard.className = "card tinted-" + sem.level;
  pctBar.className = "progress-fill " + sem.level;
  pctBar.style.width = f.pctCumplimiento === null ? "0%" : Math.min(Math.max(f.pctCumplimiento * 100, 0), 100) + "%";
}

function renderForecastSection(f) {
  document.getElementById("fcForecastVal").textContent = formatNumber(f.forecast);
  document.getElementById("fcPedidoVal").textContent = formatNumber(f.pedidoRevisado);
  document.getElementById("fcPctVal").textContent = formatPercent(f.pctPedidoVsForecast);
  const bar = document.getElementById("fcBarra");
  const sem = pctSemaphore(f.pctPedidoVsForecast);
  bar.style.width = f.pctPedidoVsForecast === null ? "0%" : Math.min(f.pctPedidoVsForecast * 100, 100) + "%";
  bar.className = "progress-fill " + sem.level;

  document.getElementById("cmpPedido").textContent = formatNumber(f.pedidoRevisado);
  document.getElementById("cmpCumplido").textContent = formatNumber(f.inventarioCumplido);
  document.getElementById("cmpPendiente").textContent = formatNumber(Math.max(f.pendiente, 0));
  document.getElementById("cmpPct").textContent = formatPercent(f.pctCumplimiento);
  const bar2 = document.getElementById("cmpBarra");
  const sem2 = pctSemaphore(f.pctCumplimiento);
  bar2.style.width = f.pctCumplimiento === null ? "0%" : Math.min(Math.max(f.pctCumplimiento * 100, 0), 100) + "%";
  bar2.className = "progress-fill " + sem2.level;
}

/* ---------------------------------------------------------------------- */
function renderWeeklyTable(weeklyRows, tieneProyeccion) {
  const tbody = document.querySelector("#tablaSemanal tbody");
  if (!weeklyRows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:20px;">No hay semanas detectadas en los datos filtrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = weeklyRows.map(w => `
    <tr>
      <td>Semana ${w.week}</td>
      <td class="num">${w.proyectado === null ? "SIN PROYECCIÓN" : formatNumber(w.proyectado)}</td>
      <td class="num">${formatNumber(w.cumplido)}</td>
      <td class="num">${w.pendiente === null ? "N/A" : formatNumber(w.pendiente)}</td>
      <td class="num">${renderPctBadge(w.pctSemanal)}</td>
      <td class="num">${renderPctBadge(w.pctAcumulado)}</td>
      <td>${renderRhythmBadge(w.ritmo)}</td>
    </tr>`).join("");
  if (!tieneProyeccion) {
    document.getElementById("weeklyProjectionNote").classList.remove("hidden");
  } else {
    document.getElementById("weeklyProjectionNote").classList.add("hidden");
  }
}

function renderPctBadge(pct) {
  const sem = pctSemaphore(pct);
  if (pct === null) return `<span class="badge badge-neutral">N/A</span>`;
  return `<span class="badge badge-${sem.level}">${formatPercent(pct)}</span>`;
}

function renderRhythmBadge(ritmo) {
  return `<span class="badge badge-${ritmo.level}">${ritmo.label}</span>`;
}

function renderAccumulatedCard(weeklyRows) {
  const last = weeklyRows.length ? weeklyRows[weeklyRows.length - 1] : null;
  const card = document.getElementById("cumplimientoAcumuladoCard");
  if (!last || last.pctAcumulado === null) {
    document.getElementById("acumPctVal").textContent = "N/A";
    document.getElementById("acumProyectado").textContent = "Proyectado acumulado: SIN PROYECCIÓN";
    document.getElementById("acumCumplido").textContent = `Cumplido acumulado: ${last ? formatNumber(last.acumuladoCumplido) : 0}`;
    document.getElementById("acumPendiente").textContent = "Pendiente: N/A";
    card.className = "card";
    return;
  }
  const sem = pctSemaphore(last.pctAcumulado);
  document.getElementById("acumPctVal").textContent = formatPercent(last.pctAcumulado);
  document.getElementById("acumProyectado").textContent = `Proyectado acumulado: ${formatNumber(last.acumuladoProyectado)}`;
  document.getElementById("acumCumplido").textContent = `Cumplido acumulado: ${formatNumber(last.acumuladoCumplido)}`;
  document.getElementById("acumPendiente").textContent = `Pendiente: ${formatNumber(Math.max(last.acumuladoProyectado - last.acumuladoCumplido, 0))}`;
  card.className = "card tinted-" + sem.level;
}

/* ---------------------------------------------------------------------- */
function renderCapacity(capacity) {
  renderAllGauges(capacity);
}

/* ---------------------------------------------------------------------- */
function renderDOH(rows) {
  const summary = calculateDOHSummary(rows);
  ["NORMAL", "ALERTA", "CRÍTICO", "SIN COBERTURA"].forEach(k => {
    const id = "resDOH_" + k.replace(/[^A-Z]/g, "");
    const el = document.getElementById(id);
    if (el) {
      el.querySelector(".rd-count").textContent = summary[k].count;
      el.querySelector(".rd-pct").textContent = formatPercent(summary[k].pct);
    }
  });

  const tbody = document.querySelector("#tablaDOH tbody");
  const sorted = rows.slice().sort((a, b) => b.doh - a.doh);
  tbody.innerHTML = sorted.map(r => {
    const status = calculateDOHStatus(r.doh);
    return `<tr>
      <td>${r.modelo}</td><td>${r.canal}</td>
      <td class="num">${formatNumber(r.inventarioGnrl)}</td>
      <td class="num">${formatNumber(r.ventas)}</td>
      <td class="num">${formatNumber(r.proVentaMensual)}</td>
      <td class="num">${r.doh.toFixed(1)}</td>
      <td><span class="badge badge-${status.level}">${status.label}</span></td>
    </tr>`;
  }).join("");
}

/* ---------------------------------------------------------------------- */
function renderPendientes(rows) {
  const pendientes = calculatePendientes(rows);
  renderPendientesChart(pendientes, APP_STATE.topNPendientes || "10");

  const tbody = document.querySelector("#tablaPendientes tbody");
  if (!pendientes.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:16px;">No hay modelos con pendiente por entregar en la selección actual.</td></tr>`;
    return;
  }
  tbody.innerHTML = pendientes.map(r => `
    <tr>
      <td>${r.modelo}</td><td>${r.canal}</td>
      <td class="num">${formatNumber(r.pedidoRevisado)}</td>
      <td class="num">${formatNumber(r.inventarioCumplido)}</td>
      <td class="num">${formatNumber(r.pendienteCalc)}</td>
      <td class="num">${formatPercent(safeDiv(r.inventarioCumplido, r.pedidoRevisado))}</td>
    </tr>`).join("");
}

/* ---------------------------------------------------------------------- */
function sortRows(rows, field, dir) {
  return rows.slice().sort((a, b) => {
    const va = a[field], vb = b[field];
    if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return dir === "asc" ? (va - vb) : (vb - va);
  });
}

function renderMatriz(rows) {
  const withPendiente = rows.map(r => ({ ...r, pendienteCalc: r.pedidoRevisado - r.inventarioCumplido }));
  const sorted = sortRows(withPendiente, SORT_MATRIZ.field, SORT_MATRIZ.dir);
  const tbody = document.querySelector("#tablaMatriz tbody");
  tbody.innerHTML = sorted.map(r => {
    const status = calculateDOHStatus(r.doh);
    return `<tr>
      <td>${r.modelo}</td><td>${r.canal}</td>
      <td class="num">${formatNumber(r.forecast)}</td>
      <td class="num">${formatNumber(r.pedidoRevisado)}</td>
      <td class="num">${formatNumber(r.inventarioCumplido)}</td>
      <td class="num">${formatNumber(r.pendienteCalc)}</td>
      <td class="num">${formatPercent(safeDiv(r.pedidoRevisado, r.forecast))}</td>
      <td class="num">${formatPercent(safeDiv(r.inventarioCumplido, r.pedidoRevisado))}</td>
      <td class="num">${r.doh.toFixed(1)}</td>
      <td>${r.estatus ? `<span class="badge badge-neutral">${r.estatus}</span>` : "—"}</td>
      <td><span class="badge badge-${status.level}">${status.label}</span></td>
    </tr>`;
  }).join("");
}

/* ---------------------------------------------------------------------- */
function renderAlerts(rows, weeklyRows, capacity) {
  const alerts = generateAlerts(rows, weeklyRows, capacity);
  const cont = document.getElementById("listaAlertas");
  if (!alerts.length) {
    cont.innerHTML = `<div class="empty-state">Sin alertas activas con los filtros actuales.</div>`;
    return;
  }
  cont.innerHTML = alerts.map(a => `<div class="list-item"><span class="badge badge-${a.level}">●</span><span>${a.text}</span></div>`).join("");
}

/* ---------------------------------------------------------------------- */
function renderExecutiveSummary(rows, weeklyRows, capacity) {
  const el = document.getElementById("resumenEjecutivo");
  if (!el) return; // Sección deshabilitada actualmente en index.html (comentada)
  const frases = generateExecutiveSummary(rows, weeklyRows, capacity);
  el.innerHTML = frases.map(f => `<p>${f}</p>`).join("");
}
