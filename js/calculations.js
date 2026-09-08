/* ============================================================================
   VENTO DASHBOARD — calculations.js
   Todas las fórmulas de negocio. Funciones puras y reutilizables.
   Diseñadas para nunca producir NaN / Infinity / división entre cero.
   ============================================================================ */

/* ----------------------------------------------------------------------
   CONFIGURACIÓN
   Sección claramente identificable para ajustar reglas de negocio sin
   tener que buscar en todo el código (ver README.md).
   ---------------------------------------------------------------------- */
const CONFIG = {
  COMPANY_NAME: "Vento Motorcycles U.S.A.",
  VENTO_LOGO_URL: "https://www.vento.com/wp-content/uploads/vento-logo.svg",

  // Contraseña para actualizar/reemplazar la base de datos.
  // Cámbiala aquí cuando lo necesites (ver README.md, "Cómo cambiar la contraseña").
  UPDATE_PASSWORD: "123",

  // Capacidad de almacenamiento por unidad de negocio (unidades de inventario).
  CAPACITY_ECOMMERCE: 1300,
  CAPACITY_DISTRIBUIDORES: 3000,
  get CAPACITY_TOTAL() { return this.CAPACITY_ECOMMERCE + this.CAPACITY_DISTRIBUIDORES; },

  // Clasificación de DOH (Days on Hand) — SOLO valor actual, sin histórico.
  DOH_NORMAL_MAX: 45,   // 1–45  => NORMAL
  DOH_ALERT_MAX: 59,    // 46–59 => ALERTA ; > 59 => CRÍTICO ; 0 => SIN COBERTURA

  // Tolerancia (en puntos porcentuales) para el ritmo de cumplimiento semanal.
  RHYTHM_TOLERANCE: 5,

  // Umbrales de semáforo para porcentajes de cumplimiento (sección 26).
  PCT_GOOD_MIN: 0.90,     // >= 90%  => verde
  PCT_WARNING_MIN: 0.70,  // 70-89.99% => amarillo; < 70% => rojo

  // Umbrales de semáforo para % de utilización de capacidad (sección 15).
  CAP_GOOD_MAX: 0.70,     // 0-70%  => verde
  CAP_WARNING_MAX: 0.90,  // 70-90% => amarillo; 90-100% => rojo; >100% => SOBRECARGA
};

/* ----------------------------------------------------------------------
   FORMATO
   ---------------------------------------------------------------------- */
function formatNumber(n) {
  if (n === null || n === undefined || !isFinite(n)) return "0";
  return Math.round(n).toLocaleString("es-MX");
}
function formatPercent(n, decimals = 1) {
  if (n === null || n === undefined || !isFinite(n)) return "N/A";
  return (n * 100).toFixed(decimals) + "%";
}
function safeDiv(numerator, denominator) {
  if (!denominator || !isFinite(denominator) || denominator === 0) return null; // null = N/A
  const r = numerator / denominator;
  return isFinite(r) ? r : null;
}

/* ----------------------------------------------------------------------
   SEMÁFORO DE PORCENTAJES (cumplimiento, entrega, FC, etc.)
   ---------------------------------------------------------------------- */
function pctSemaphore(pct) {
  if (pct === null || pct === undefined || !isFinite(pct)) return { level: "neutral", label: "N/A" };
  if (pct >= CONFIG.PCT_GOOD_MIN) return { level: "success", label: "FAVORABLE" };
  if (pct >= CONFIG.PCT_WARNING_MIN) return { level: "warning", label: "ATENCIÓN" };
  return { level: "danger", label: "CRÍTICO" };
}

/* ----------------------------------------------------------------------
   CUMPLIMIENTO (Forecast / Pedido / Cumplido)
   ---------------------------------------------------------------------- */
function calculateFulfillment(rows) {
  const forecast = sumField(rows, "forecast");
  const pedidoRevisado = sumField(rows, "pedidoRevisado");
  const inventarioCumplido = sumField(rows, "inventarioCumplido");
  const trasladoCompletado = sumField(rows, "trasladoCompletado");
  const pendiente = pedidoRevisado - inventarioCumplido;

  const pctPedidoVsForecast = safeDiv(pedidoRevisado, forecast);
  const pctCumplimiento = safeDiv(inventarioCumplido, pedidoRevisado);

  return { forecast, pedidoRevisado, inventarioCumplido, trasladoCompletado, pendiente, pctPedidoVsForecast, pctCumplimiento };
}

function sumField(rows, field) {
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

/* ----------------------------------------------------------------------
   DOH — SOLO VALOR ACTUAL (sección 17-20: sin histórico, sin tendencia)
   ---------------------------------------------------------------------- */
function calculateDOHStatus(doh) {
  if (!doh || doh === 0) return { level: "neutral", label: "SIN COBERTURA" };
  if (doh <= CONFIG.DOH_NORMAL_MAX) return { level: "success", label: "NORMAL" };
  if (doh <= CONFIG.DOH_ALERT_MAX) return { level: "warning", label: "ALERTA" };
  return { level: "danger", label: "CRÍTICO" };
}

function calculateDOHSummary(rows) {
  const total = rows.length || 1;
  const buckets = { NORMAL: 0, ALERTA: 0, "CRÍTICO": 0, "SIN COBERTURA": 0 };
  rows.forEach(r => { buckets[calculateDOHStatus(r.doh).label]++; });
  const out = {};
  Object.keys(buckets).forEach(k => { out[k] = { count: buckets[k], pct: buckets[k] / total }; });
  return out;
}

/* ----------------------------------------------------------------------
   CAPACIDAD / UTILIZACIÓN (sección 13-16)
   IMPORTANTE — evitar doble conteo (sección 48): "Inventario Gnrl." ya
   representa el total por modelo/canal; los almacenes (60.3, 17.7, 17.4)
   NO se vuelven a sumar. El inventario utilizado por canal es
   simplemente la suma de "Inventario Gnrl." de los modelos de ese canal.
   ---------------------------------------------------------------------- */
function calculateCapacity(rows) {
  const ecommerce = rows.filter(r => r.canal === "E-COMMERCE");
  const distribuidores = rows.filter(r => r.canal === "DISTRIBUIDORES");

  const usedEcommerce = sumField(ecommerce, "inventarioGnrl");       // sin sumar 60.3+17.7 aparte
  const usedDistribuidores = sumField(distribuidores, "inventarioGnrl"); // sin sumar 17.4 aparte
  const usedTotal = usedEcommerce + usedDistribuidores;

  const build = (used, capacity) => {
    const pct = safeDiv(used, capacity);
    const available = Math.max(capacity - used, 0);
    const overload = Math.max(used - capacity, 0);
    let level = "success";
    if (pct !== null) {
      if (pct > 1) level = "overload";
      else if (pct > CONFIG.CAP_WARNING_MAX) level = "danger";
      else if (pct > CONFIG.CAP_GOOD_MAX) level = "warning";
    }
    return { used, capacity, pct, available, overload, level };
  };

  return {
    ecommerce: build(usedEcommerce, CONFIG.CAPACITY_ECOMMERCE),
    distribuidores: build(usedDistribuidores, CONFIG.CAPACITY_DISTRIBUIDORES),
    total: build(usedTotal, CONFIG.CAPACITY_TOTAL),
  };
}

/* ----------------------------------------------------------------------
   CUMPLIMIENTO SEMANAL — Proyectado vs Cumplido (sección 6-10)
   - "Cumplido" real = columnas numéricas de semana (37,38,39,...) ya
     normalizadas en cada registro como `semanas[week]`.
   - "Proyectado" = `proyectadoSemanal[week]` SI la base la trae. Si no
     existe ninguna columna de proyección semanal, se marca explícitamente
     como "SIN PROYECCIÓN" (no se inventa un reparto).
   ---------------------------------------------------------------------- */
function calculateWeeklyFulfillment(rows, weeksAvailable, tieneProyeccionSemanal) {
  let accProyectado = 0;
  let accCumplido = 0;
  const totalWeeks = weeksAvailable.length || 1;

  return weeksAvailable.map((week, idx) => {
    const proyectado = tieneProyeccionSemanal
      ? sumField(rows.map(r => ({ v: (r.proyectadoSemanal || {})[week] || 0 })), "v")
      : null; // null = sin proyección disponible para esta semana
    const cumplido = sumField(rows.map(r => ({ v: (r.semanas || {})[week] || 0 })), "v");

    if (proyectado !== null) accProyectado += proyectado;
    accCumplido += cumplido;

    const pendiente = proyectado !== null ? Math.max(proyectado - cumplido, 0) : null;
    const pctSemanal = proyectado !== null ? safeDiv(cumplido, proyectado) : null;
    const pctAcumulado = proyectado !== null ? safeDiv(accCumplido, accProyectado) : null;

    // % esperado dinámico según posición de la semana (sección 10):
    // no se hard-codean las 4 semanas; se calcula (posición / total).
    const pctEsperadoAcumulado = (idx + 1) / totalWeeks;

    const ritmo = calculateRhythm(pctAcumulado, pctEsperadoAcumulado);

    return {
      week, proyectado, cumplido, pendiente, pctSemanal, pctAcumulado,
      pctEsperadoAcumulado, ritmo,
      acumuladoProyectado: proyectado !== null ? accProyectado : null,
      acumuladoCumplido: accCumplido,
    };
  });
}

/* ----------------------------------------------------------------------
   RITMO DE CUMPLIMIENTO (sección 10)
   Compara % acumulado real contra % esperado acumulado, con tolerancia.
   ---------------------------------------------------------------------- */
function calculateRhythm(pctAcumuladoReal, pctEsperado) {
  if (pctAcumuladoReal === null || pctEsperado === null) return { level: "neutral", label: "SIN PROYECCIÓN" };
  const diffPuntos = (pctAcumuladoReal - pctEsperado) * 100;
  const tol = CONFIG.RHYTHM_TOLERANCE;
  if (diffPuntos < -tol) return { level: "danger", label: "ATRASADO" };
  if (diffPuntos > tol) return { level: "success", label: "ADELANTADO" };
  return { level: "warning", label: "EN LÍNEA" };
}

/* ----------------------------------------------------------------------
   PENDIENTES (sección 22-23)
   ---------------------------------------------------------------------- */
function calculatePendientes(rows) {
  return rows
    .map(r => ({ ...r, pendienteCalc: r.pedidoRevisado - r.inventarioCumplido }))
    .filter(r => r.pendienteCalc > 0)
    .sort((a, b) => b.pendienteCalc - a.pendienteCalc);
}

/* ----------------------------------------------------------------------
   RESUMEN EJECUTIVO (texto dinámico, sección 33)
   ---------------------------------------------------------------------- */
function generateExecutiveSummary(rows, weeklyRows, capacity) {
  const f = calculateFulfillment(rows);
  const dohSummary = calculateDOHSummary(rows);
  const lastWeek = weeklyRows.length ? weeklyRows[weeklyRows.length - 1] : null;

  const frases = [];

  if (f.pctPedidoVsForecast !== null) {
    frases.push(`El pedido revisado representa el ${formatPercent(f.pctPedidoVsForecast)} del Forecast (${formatNumber(f.forecast)} unidades esperadas vs ${formatNumber(f.pedidoRevisado)} solicitadas).`);
  } else {
    frases.push(`No hay Forecast registrado para el conjunto de datos filtrado actualmente.`);
  }

  if (f.pctCumplimiento !== null) {
    frases.push(`Se ha cumplido el ${formatPercent(f.pctCumplimiento)} del pedido revisado: ${formatNumber(f.inventarioCumplido)} de ${formatNumber(f.pedidoRevisado)} unidades, quedando ${formatNumber(Math.max(f.pendiente, 0))} pendientes.`);
  }

  if (lastWeek && lastWeek.ritmo.label !== "SIN PROYECCIÓN") {
    frases.push(`El ritmo de cumplimiento semanal está actualmente ${lastWeek.ritmo.label} respecto al plan.`);
  }

  const mayorCanal = capacity.ecommerce.pct !== null && capacity.distribuidores.pct !== null
    ? (capacity.ecommerce.pct >= capacity.distribuidores.pct ? "E-COMMERCE" : "DISTRIBUIDORES")
    : null;
  if (mayorCanal) {
    const pctC = mayorCanal === "E-COMMERCE" ? capacity.ecommerce.pct : capacity.distribuidores.pct;
    frases.push(`La unidad con mayor utilización de capacidad es ${mayorCanal} (${formatPercent(pctC)}). Capacidad total disponible: ${formatNumber(capacity.total.available)} de ${formatNumber(CONFIG.CAPACITY_TOTAL)} unidades.`);
  }

  frases.push(`Modelos críticos por DOH: ${dohSummary["CRÍTICO"].count}. En alerta: ${dohSummary["ALERTA"].count}. Sin cobertura: ${dohSummary["SIN COBERTURA"].count}.`);

  return frases;
}

/* ----------------------------------------------------------------------
   ALERTAS (sección 34) — sólo lo más relevante
   ---------------------------------------------------------------------- */
function generateAlerts(rows, weeklyRows, capacity) {
  const alerts = [];

  const criticos = rows.filter(r => calculateDOHStatus(r.doh).label === "CRÍTICO");
  if (criticos.length) alerts.push({ level: "danger", text: `${criticos.length} modelo(s) con DOH CRÍTICO (60+ días).` });

  const sinCobertura = rows.filter(r => calculateDOHStatus(r.doh).label === "SIN COBERTURA");
  if (sinCobertura.length) alerts.push({ level: "neutral", text: `${sinCobertura.length} modelo(s) SIN COBERTURA de inventario (DOH = 0).` });

  const pendientesAltos = calculatePendientes(rows);
  if (pendientesAltos.length) alerts.push({ level: "warning", text: `${pendientesAltos.length} modelo(s) con pendiente por entregar mayor a 0.` });

  const lastWeek = weeklyRows.length ? weeklyRows[weeklyRows.length - 1] : null;
  if (lastWeek && lastWeek.ritmo.label === "ATRASADO") {
    alerts.push({ level: "danger", text: `Cumplimiento acumulado ATRASADO respecto al ritmo esperado (semana ${lastWeek.week}).` });
  }
  if (lastWeek && lastWeek.pctSemanal !== null && lastWeek.pctSemanal < CONFIG.PCT_WARNING_MIN) {
    alerts.push({ level: "danger", text: `Cumplimiento semanal bajo en la semana ${lastWeek.week}: ${formatPercent(lastWeek.pctSemanal)}.` });
  }

  [["E-COMMERCE", capacity.ecommerce], ["DISTRIBUIDORES", capacity.distribuidores]].forEach(([name, cap]) => {
    if (cap.level === "overload") alerts.push({ level: "danger", text: `Capacidad EXCEDIDA en ${name}: ${formatNumber(cap.overload)} unidades por encima del límite.` });
    else if (cap.level === "danger") alerts.push({ level: "warning", text: `Capacidad de ${name} cercana al límite (${formatPercent(cap.pct)}).` });
  });

  return alerts;
}
