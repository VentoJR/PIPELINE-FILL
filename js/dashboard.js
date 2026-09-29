/* ============================================================================
   VENTO DASHBOARD — dashboard.js
   Actualiza visualmente tarjetas, tablas, gauges y texto a partir de los
   datos ya filtrados y calculados.
   ============================================================================ */

let SORT_MATRIZ = { field: "pendienteCalc", dir: "desc" };
let CURRENT_WEEKLY_ROWS = []; // se guarda para poder abrir el detalle de semana al hacer clic

function updateDashboard() {
  let filtered = applyFilters(APP_STATE.data);

  // Si hay 2+ Forecast y está en "Todos", NO se suman automáticamente
  // (regla explícita): se bloquea el análisis y se pide elegir uno.
  const periodos = APP_STATE.forecastPeriodsAvailable || [];
  const necesitaSeleccion = periodos.length > 1 && FilterState.forecastPeriodo === "TODOS";
  document.getElementById("forecastGuardNotice").classList.toggle("hidden", !necesitaSeleccion);
  if (necesitaSeleccion) filtered = [];

  const weeklyRows = calculateWeeklyFulfillment(filtered, APP_STATE.weeksAvailable, APP_STATE.tieneProyeccionSemanal);
  CURRENT_WEEKLY_ROWS = weeklyRows;
  const capacity = calculateCapacity(filtered);
  const fulfillment = calculateFulfillment(filtered);

  renderMesProyectado();
  renderKPIs(fulfillment);
  renderAlertasEjecutivas(filtered);
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
function renderMesProyectado() {
  const el = document.getElementById("mesProyectado");
  if (!el) return;
  const periodos = APP_STATE.forecastPeriodsAvailable || [];
  if (periodos.length > 1) {
    el.textContent = FilterState.forecastPeriodo === "TODOS"
      ? "FORECAST ACTIVO: TODOS"
      : `FORECAST ACTIVO: ${FilterState.forecastPeriodo}`;
    return;
  }
  el.textContent = APP_STATE.forecastMonthLabel
    ? `FORECAST CORRIENDO: ${APP_STATE.forecastMonthLabel}`
    : "FORECAST CORRIENDO: SIN INFORMACIÓN";
}

/* ---------------------------------------------------------------------- */
function renderKPIs(f) {
  document.getElementById("kpiForecast").textContent = formatNumber(f.forecast);
  document.getElementById("kpiPedido").textContent = formatNumber(f.pedidoRevisado);
  document.getElementById("kpiPendiente").textContent = formatNumber(Math.max(f.pendiente, 0));
  document.getElementById("kpiTraslado").textContent = formatNumber(f.trasladoCompletado);

  // Nota: "Inventario Cumplido" e "Inventario Total Proyectado" se eliminaron
  // de la interfaz (sección Capacidad/KPIs), pero f.inventarioCumplido,
  // f.inventarioTotalProyectado y f.pctAvancePipeline se siguen calculando
  // igual en calculations.js y se usan en tablas, matriz y alertas.

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
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="text-align:center;padding:20px;">No hay semanas detectadas en los datos filtrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = weeklyRows.map(w => {
    const brecha = w.proyectado === null ? null : (w.cumplido - w.proyectado);
    return `
    <tr class="clickable-row" data-week="${w.week}" title="Ver modelos de la semana ${w.week}">
      <td>Semana ${w.week}</td>
      <td class="num">${w.proyectado === null ? "SIN PROYECCIÓN" : formatNumber(w.proyectado)}</td>
      <td class="num">${formatNumber(w.cumplido)}</td>
      <td class="num">${w.pendiente === null ? "N/A" : formatNumber(w.pendiente)}</td>
      <td class="num">${brecha === null ? "N/A" : formatNumber(brecha)}</td>
      <td class="num">${renderPctBadge(w.pctSemanal)}</td>
      <td class="num">${renderPctBadge(w.pctAcumulado)}</td>
      <td>${renderRhythmBadge(w.ritmo)}</td>
    </tr>`;
  }).join("");
  document.querySelectorAll("#tablaSemanal tbody tr[data-week]").forEach(tr => {
    tr.addEventListener("click", () => openWeekDetailModal(parseInt(tr.dataset.week, 10)));
  });
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
  cont.innerHTML = alerts.map((a, i) => `<div class="list-item clickable-row" data-alert-index="${i}" title="Ver detalle"><span class="badge badge-${a.level}">●</span><span>${a.text}</span></div>`).join("");
  cont.querySelectorAll("[data-alert-index]").forEach(el => {
    el.addEventListener("click", () => openAlertDetail(alerts[parseInt(el.dataset.alertIndex, 10)]));
  });
}

/* Abre el detalle correspondiente según el tipo de alerta (reutiliza los
   modales y funciones ya existentes; no duplica lógica de cálculo). */
function openAlertDetail(alert) {
  if (!alert.type) return;
  if (alert.type === "semana") {
    openWeekDetailModal(alert.payload);
    return;
  }
  if (alert.type === "capacidad") {
    const { nombre, cap } = alert.payload;
    document.getElementById("modelDetailTitle").textContent = `CAPACIDAD — ${nombre}`;
    document.getElementById("modelDetailBody").innerHTML = `
      <div class="grid-2" style="gap:10px;margin:14px 0;">
        <div><div class="kpi-label">Utilizado</div><div class="kpi-value" style="font-size:20px;">${formatNumber(cap.used)}</div></div>
        <div><div class="kpi-label">Capacidad</div><div class="kpi-value" style="font-size:20px;">${formatNumber(cap.capacity)}</div></div>
        <div><div class="kpi-label">% Utilización</div><div class="kpi-value" style="font-size:20px;">${formatPercent(cap.pct)}</div></div>
        <div><div class="kpi-label">Disponible</div><div class="kpi-value" style="font-size:20px;">${formatNumber(cap.available)}</div></div>
      </div>`;
    document.getElementById("modelDetailModal").classList.remove("hidden");
    return;
  }
  // doh-critico | sin-cobertura | pendientes -> lista de modelos (payload es un arreglo)
  const rows = alert.payload || [];
  document.getElementById("weekDetailTitle").textContent = alert.text;
  const table = rows.length ? `
    <table style="width:100%;font-size:12.5px;">
      <thead><tr><th style="text-align:left;">Modelo</th><th style="text-align:left;">Canal</th><th class="num">DOH</th><th class="num">Inventario</th><th class="num">Pendiente</th></tr></thead>
      <tbody>${rows.map(r => `
        <tr class="clickable-row" data-modelo="${r.modelo}" data-canal="${r.canal}">
          <td>${r.modelo}</td><td>${r.canal}</td>
          <td class="num">${r.doh !== undefined ? r.doh.toFixed(1) : "—"}</td>
          <td class="num">${r.inventarioGnrl !== undefined ? formatNumber(r.inventarioGnrl) : "—"}</td>
          <td class="num">${r.pendienteCalc !== undefined ? formatNumber(r.pendienteCalc) : "—"}</td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-state">Sin modelos para mostrar.</div>`;
  document.getElementById("weekDetailBody").innerHTML = table;
  document.getElementById("weekDetailModal").classList.remove("hidden");
  document.querySelectorAll("#weekDetailBody [data-modelo]").forEach(tr => {
    tr.addEventListener("click", () => {
      document.getElementById("weekDetailModal").classList.add("hidden");
      openModelDetailModal(tr.dataset.modelo, tr.dataset.canal);
    });
  });
}

/* ---------------------------------------------------------------------- */
function renderExecutiveSummary(rows, weeklyRows, capacity) {
  const el = document.getElementById("resumenEjecutivo");
  if (!el) return; // Sección deshabilitada actualmente en index.html (comentada)
  const frases = generateExecutiveSummary(rows, weeklyRows, capacity);
  el.innerHTML = frases.map(f => `<p>${f}</p>`).join("");
}

/* ============================================================================
   ALERTAS EJECUTIVAS + MODALES DE DETALLE — funciones NUEVAS.
   No modifican renderAlerts() ni ningún render existente.
   ============================================================================ */
function estatusIcon(level) {
  return { danger: "🔴", warning: "🟠", neutral: "⚪" }[level] || "🟡";
}

function renderAlertasEjecutivas(rows) {
  const cont = document.getElementById("alertasEjecutivas");
  if (!cont) return;
  const gaps = analyzeModelGaps(rows);
  if (!gaps.length) {
    cont.innerHTML = `<div class="empty-state">No hay modelos con Pedido Revisado por debajo del Forecast en la selección actual.</div>`;
    return;
  }
  cont.innerHTML = gaps.map(g => `
    <div class="list-item clickable-row" data-modelo="${g.modelo}" data-canal="${g.canal}" style="align-items:flex-start;">
      <span>${estatusIcon(g.estatus.level)}</span>
      <span style="flex:1;">
        <b>${g.modelo}</b> <span class="badge badge-neutral">${g.canal}</span>
        — Forecast ${formatNumber(g.forecast)} · Pedido ${formatNumber(g.pedidoRevisado)} · Diferencia ${formatNumber(g.diferencia)}<br>
        <span class="badge badge-${g.estatus.level}">${g.causa}</span>
        <span style="color:var(--color-text-muted);"> ${g.explicacion}</span>
      </span>
      <span class="badge badge-${g.estatus.level}">${g.estatus.label}</span>
    </div>`).join("");
  cont.querySelectorAll("[data-modelo]").forEach(el => {
    el.addEventListener("click", () => openModelDetailModal(el.dataset.modelo, el.dataset.canal));
  });
}

function openModelDetailModal(modelo, canal) {
  const filtered = applyFilters(APP_STATE.data);
  const rows = filtered.filter(r => r.modelo === modelo && r.canal === canal);
  if (!rows.length) return;
  const gap = analyzeModelGaps(rows)[0]; // misma causa/estatus que en la tarjeta
  const r = rows[0];
  const causa = gap ? gap.causa : "CONTROLADO";
  const explicacion = gap ? gap.explicacion : "El pedido revisado cubre o supera el Forecast para este modelo.";
  const estatus = gap ? gap.estatus : { level: "success", label: "CONTROLADO" };
  const dohStatus = calculateDOHStatus(r.doh);
  const semanaActual = APP_STATE.weeksAvailable.length ? APP_STATE.weeksAvailable[APP_STATE.weeksAvailable.length - 1] : null;

  document.getElementById("modelDetailTitle").textContent = `MODELO: ${modelo}`;
  document.getElementById("modelDetailBody").innerHTML = `
    <p><span class="badge badge-${estatus.level}">${causa}</span></p>
    <div class="grid-2" style="gap:10px;margin:14px 0;">
      <div><div class="kpi-label">Forecast</div><div class="kpi-value" style="font-size:20px;">${formatNumber(r.forecast)}</div></div>
      <div><div class="kpi-label">Pedido Revisado</div><div class="kpi-value" style="font-size:20px;">${formatNumber(r.pedidoRevisado)}</div></div>
      <div><div class="kpi-label">Diferencia</div><div class="kpi-value" style="font-size:20px;">${formatNumber(r.pedidoRevisado - r.forecast)}</div></div>
      <div><div class="kpi-label">Inventario (Gnrl.)</div><div class="kpi-value" style="font-size:20px;">${formatNumber(r.inventarioGnrl)}</div></div>
      <div><div class="kpi-label">Venta</div><div class="kpi-value" style="font-size:20px;">${formatNumber(r.ventas)}</div></div>
      <div><div class="kpi-label">DOH</div><div class="kpi-value" style="font-size:20px;">${r.doh.toFixed(1)} <span class="badge badge-${dohStatus.level}">${dohStatus.label}</span></div></div>
      <div><div class="kpi-label">Semana</div><div class="kpi-value" style="font-size:20px;">${semanaActual !== null ? "Semana " + semanaActual : "Sin información"}</div></div>
      <div><div class="kpi-label">Canal</div><div class="kpi-value" style="font-size:20px;">${r.canal}</div></div>
    </div>
    <p><b>Estatus:</b> <span class="badge badge-${estatus.level}">${estatus.label}</span></p>
    <p><b>Explicación ejecutiva:</b><br>${explicacion}</p>
  `;
  document.getElementById("modelDetailModal").classList.remove("hidden");
}

function openWeekDetailModal(week) {
  const filtered = applyFilters(APP_STATE.data);
  const weekRow = CURRENT_WEEKLY_ROWS.find(w => w.week === week);
  const breakdown = getWeekModelBreakdown(filtered, week).filter(m => m.pendiente > 0).slice(0, 20);

  document.getElementById("weekDetailTitle").textContent = `SEMANA ${week}`;
  const header = weekRow ? `
    <div class="grid-2" style="gap:10px;margin-bottom:14px;">
      <div><div class="kpi-label">Proyectado</div><div class="kpi-value" style="font-size:20px;">${weekRow.proyectado === null ? "SIN PROYECCIÓN" : formatNumber(weekRow.proyectado)}</div></div>
      <div><div class="kpi-label">Cumplido</div><div class="kpi-value" style="font-size:20px;">${formatNumber(weekRow.cumplido)}</div></div>
      <div><div class="kpi-label">Pendiente</div><div class="kpi-value" style="font-size:20px;">${weekRow.pendiente === null ? "N/A" : formatNumber(weekRow.pendiente)}</div></div>
      <div><div class="kpi-label">% Cumplimiento</div><div class="kpi-value" style="font-size:20px;">${weekRow.pctSemanal === null ? "N/A" : formatPercent(weekRow.pctSemanal)}</div></div>
    </div>` : "";

  const table = breakdown.length ? `
    <table style="width:100%;font-size:12.5px;">
      <thead><tr><th style="text-align:left;">Modelo</th><th class="num">Proyectado</th><th class="num">Cumplido</th><th class="num">Pendiente</th><th class="num">%</th><th style="text-align:left;">Causa</th></tr></thead>
      <tbody>${breakdown.map(m => `
        <tr>
          <td>${m.modelo} <span class="badge badge-neutral">${m.canal}</span></td>
          <td class="num">${formatNumber(m.proyectado)}</td>
          <td class="num">${formatNumber(m.cumplido)}</td>
          <td class="num">${formatNumber(m.pendiente)}</td>
          <td class="num">${m.pct === null ? "N/A" : formatPercent(m.pct)}</td>
          <td>${m.causa}</td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-state">Sin proyección semanal disponible para desglosar esta semana, o no hay pendiente.</div>`;

  document.getElementById("weekDetailBody").innerHTML = header + "<p><b>Modelos que explican el resultado:</b></p>" + table;
  document.getElementById("weekDetailModal").classList.remove("hidden");
}

function wireDetailModals() {
  document.getElementById("btnCerrarModelDetail").addEventListener("click", () => document.getElementById("modelDetailModal").classList.add("hidden"));
  document.getElementById("btnCerrarWeekDetail").addEventListener("click", () => document.getElementById("weekDetailModal").classList.add("hidden"));
}
document.addEventListener("DOMContentLoaded", wireDetailModals);
