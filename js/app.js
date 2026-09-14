const APP_STATE = {
  data: [],
  weeksAvailable: [],
  tieneProyeccionSemanal: false,
  topNPendientes: "10",
};

function init() {
  applyLogo();
  loadInitialData();
  wireFilters();
  wireTopSelectors();
  wireSortableHeaders();
  wireSecurityUI();
  wireFileImport();
  wireExcelExport();
  document.getElementById("btnLimpiarFiltros").addEventListener("click", handleClearFilters);
  document.getElementById("btnActualizarHora").addEventListener("click", () => {
    document.getElementById("ultimaActualizacion").textContent = "Actualizado: " + new Date().toLocaleString("es-MX");
    updateDashboard();
  });

  document.getElementById("ultimaActualizacion").textContent = "Actualizado: " + new Date().toLocaleString("es-MX");
  updateDashboard();
}

/* ---------------------------------------------------------------------- */
function applyLogo() {
  const img = document.getElementById("brandLogo");
  img.src = CONFIG.VENTO_LOGO_URL;
  img.alt = CONFIG.COMPANY_NAME;
  img.addEventListener("error", () => {
    img.classList.add("hidden");
    document.getElementById("brandLogoFallback").classList.remove("hidden");
  }, { once: true });
  document.title = CONFIG.COMPANY_NAME + " — Supply Chain Dashboard";
}

/* ---------------------------------------------------------------------- */
function loadInitialData() {
  const result = loadDefaultData();
  applyLoadResult(result, "base.csv (incluida por defecto)");
}

function applyLoadResult(result, sourceLabel) {
  APP_STATE.data = result.data;
  APP_STATE.weeksAvailable = result.weeksAvailable;
  APP_STATE.tieneProyeccionSemanal = result.tieneProyeccionSemanal;

  refreshDynamicFilterOptions(APP_STATE.data, APP_STATE.weeksAvailable);
  showValidationNotice(result.validation, sourceLabel);
}

function showValidationNotice(validation, sourceLabel) {
  const el = document.getElementById("validationNotice");
  if (!validation || validation.ok) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `
    <strong>Algunas columnas no fueron encontradas.</strong> Se cargarán únicamente los indicadores disponibles.
    <div style="margin-top:6px;">Columnas faltantes: ${validation.missing.join(", ")}</div>
    <div style="margin-top:2px; font-size:11.5px; color: var(--color-text-muted);">Fuente: ${sourceLabel}</div>
  `;
}

/* ---------------------------------------------------------------------- */
function wireFilters() {
  document.getElementById("btnToggleFiltros").addEventListener("click", () => {
    const wrap = document.getElementById("filterFieldsWrap");
    const chevron = document.getElementById("filtrosChevron");
    wrap.classList.toggle("open");
    chevron.textContent = wrap.classList.contains("open") ? "▴" : "▾";
  });

  document.querySelectorAll(".canal-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".canal-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      FilterState.canal = btn.dataset.canal;
      updateDashboard();
    });
  });

  document.getElementById("filtroModelo").addEventListener("change", e => { FilterState.modelo = e.target.value; updateDashboard(); });
  document.getElementById("filtroModeloAgrupado").addEventListener("change", e => { FilterState.modeloAgrupado = e.target.value; updateDashboard(); });
  document.getElementById("filtroSemana").addEventListener("change", e => { FilterState.semana = e.target.value; updateDashboard(); });
  document.getElementById("filtroEstatus").addEventListener("change", e => { FilterState.estatus = e.target.value; updateDashboard(); });
  document.getElementById("buscarModelo").addEventListener("input", e => { FilterState.search = e.target.value; updateDashboard(); });
}

function handleClearFilters() {
  resetFilters();
  document.querySelectorAll(".canal-tab").forEach(b => b.classList.remove("active"));
  document.querySelector('.canal-tab[data-canal="TODAS"]').classList.add("active");
  document.getElementById("filtroModelo").value = "TODOS";
  document.getElementById("filtroModeloAgrupado").value = "TODOS";
  document.getElementById("filtroSemana").value = "TODAS";
  document.getElementById("filtroEstatus").value = "TODOS";
  document.getElementById("buscarModelo").value = "";
  updateDashboard();
}

/* ---------------------------------------------------------------------- */
function wireTopSelectors() {
  document.getElementById("selTopPendientes").addEventListener("change", e => {
    APP_STATE.topNPendientes = e.target.value;
    updateDashboard();
  });
}

/* ---------------------------------------------------------------------- */
function wireSortableHeaders() {
  document.querySelectorAll("#tablaMatriz th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const field = th.dataset.sort;
      const dir = th.dataset.dir === "desc" ? "asc" : "desc";
      document.querySelectorAll("#tablaMatriz th[data-sort]").forEach(t => t.removeAttribute("data-dir"));
      th.dataset.dir = dir;
      SORT_MATRIZ = { field, dir };
      updateDashboard();
    });
  });
}

/* ---------------------------------------------------------------------- */
function wireFileImport() {
  document.getElementById("inputArchivoCSV").addEventListener("change", async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      const validation = validateColumns(parsed.headers);
      const normalized = normalizeData(parsed);
      if (!normalized.data.length) {
        alert("El archivo no contiene registros válidos (falta la columna 'Modelo Planeación' o está vacío).");
        return;
      }
      applyLoadResult({ ...normalized, validation }, file.name);
      resetFilters();
      document.querySelectorAll(".canal-tab").forEach(b => b.classList.remove("active"));
      document.querySelector('.canal-tab[data-canal="TODAS"]').classList.add("active");
      document.getElementById("buscarModelo").value = "";
      updateDashboard();
      document.getElementById("ultimaActualizacion").textContent = `Base actualizada: ${file.name} — ${new Date().toLocaleString("es-MX")}`;
    } catch (err) {
      alert("No se pudo leer el archivo: " + err.message);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

function buildExportRows() {
  const data = APP_STATE.data;

  const almacenKeys = Array.from(new Set(data.flatMap(r => Object.keys(r.almacenes || {}))));
  const weekKeys = APP_STATE.weeksAvailable || [];

  return data.map(r => {
    const row = {
      "Unidad de Negocio": r.canal,
      "Modelo Planeación": r.modelo,
      "Modelo Agrupado": r.modeloAgrupado,
      "FC Septiembre": r.forecast,
      "Inventario Total Proyectado": r.inventarioTotalProyectado,
      "% Asignacion": r.pctAsignacion,
      "Inv Asignado": r.invAsignado,
      "Cumplimiento de Inv": r.cumplimientoInv,
    };
    almacenKeys.forEach(k => { row[k] = (r.almacenes || {})[k] ?? ""; });
    Object.assign(row, {
      "Inventario Gnrl.": r.inventarioGnrl,
      "Ventas": r.ventas,
      "Pro Venta Mensual": r.proVentaMensual,
      "PVD": r.pvd,
      "DOH": r.doh,
      "Programado (Logística)": r.programado,
      "Motos en Recepción Pendiente": r.recepcionPendiente,
      "Traslado Completado": r.trasladoCompletado,
      "Requerimiento": r.requerimiento,
      "Diferencia": r.diferencia,
      "Pedido Revisado": r.pedidoRevisado,
      "Pendiente por entregar": r.pendienteColOrigen,
      "% Cumplimiento de Entrega": r.pctCumplimientoEntregaOrigen,
      "% Cumplimiento FC": r.pctCumplimientoFCOrigen,
      "Desviacion FC": r.desviacionFC,
      "DOH Proyectado": r.dohProyectado,
      "Comentarios": r.comentarios,
    });
    weekKeys.forEach(w => { row[`Inventario Proyectado ${w}`] = (r.proyectadoSemanal || {})[w] ?? ""; });
    weekKeys.forEach(w => { row[String(w)] = (r.semanas || {})[w] ?? ""; });
    row["Inventario Cumplido (calculado)"] = r.inventarioCumplido;
    row["ESTATUS"] = r.estatus;
    return row;
  });
}

function downloadExcel() {
  if (!APP_STATE.data.length) {
    alert("No hay datos cargados para exportar.");
    return;
  }
  const rows = buildExportRows();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Base_Inventario");

  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  XLSX.writeFile(workbook, `Base_Inventario_${fecha}.xlsx`);
}

function wireExcelExport() {
  document.getElementById("btnDescargarExcel").addEventListener("click", downloadExcel);
}