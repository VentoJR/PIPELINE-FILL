/* ============================================================================
   VENTO DASHBOARD — filters.js
   Estado de los filtros, aplicación sobre los datos y población dinámica
   de los <select> de Modelo / Modelo Agrupado / Semana / Estatus.
   ============================================================================ */

const FilterState = {
  canal: "TODAS",
  modelo: "TODOS",
  modeloAgrupado: "TODOS",
  semana: "TODAS",
  estatus: "TODOS",
  search: "",
};

function resetFilters() {
  FilterState.canal = "TODAS";
  FilterState.modelo = "TODOS";
  FilterState.modeloAgrupado = "TODOS";
  FilterState.semana = "TODAS";
  FilterState.estatus = "TODOS";
  FilterState.search = "";
}

/* Aplica el estado de filtros sobre el arreglo de datos normalizados. */
function applyFilters(data) {
  return data.filter(r => {
    if (FilterState.canal !== "TODAS" && r.canal !== FilterState.canal) return false;
    if (FilterState.modelo !== "TODOS" && r.modelo !== FilterState.modelo) return false;
    if (FilterState.modeloAgrupado !== "TODOS" && r.modeloAgrupado !== FilterState.modeloAgrupado) return false;
    if (FilterState.estatus !== "TODOS" && r.estatus !== FilterState.estatus) return false;
    if (FilterState.semana !== "TODAS") {
      const week = parseInt(FilterState.semana, 10);
      const tieneSemana = r.semanas && Object.prototype.hasOwnProperty.call(r.semanas, week);
      if (!tieneSemana || !(r.semanas[week] > 0)) return false;
    }
    if (FilterState.search) {
      const q = FilterState.search.toLowerCase();
      const hay = r.modelo.toLowerCase().includes(q) || r.modeloAgrupado.toLowerCase().includes(q);
      if (!hay) return false;
    }
    return true;
  });
}

/* Llena un <select> con opciones únicas + la opción "Todos/Todas". */
function populateSelect(selectEl, options, allValue, allLabel) {
  const current = selectEl.value || allValue;
  selectEl.innerHTML = `<option value="${allValue}">${allLabel}</option>` +
    options.map(o => `<option value="${o}">${o}</option>`).join("");
  selectEl.value = options.includes(current) || current === allValue ? current : allValue;
}

function uniqueValues(data, field) {
  return Array.from(new Set(data.map(r => r[field]).filter(v => v))).sort();
}

/* Refresca las listas dinámicas de Modelo / Modelo Agrupado / Estatus / Semana
   a partir del conjunto de datos completo (no filtrado), para que el
   usuario siempre pueda cambiar de un filtro a otro. */
function refreshDynamicFilterOptions(fullData, weeksAvailable) {
  populateSelect(document.getElementById("filtroModelo"), uniqueValues(fullData, "modelo"), "TODOS", "Todos");
  populateSelect(document.getElementById("filtroModeloAgrupado"), uniqueValues(fullData, "modeloAgrupado"), "TODOS", "Todos");
  populateSelect(document.getElementById("filtroEstatus"), uniqueValues(fullData, "estatus"), "TODOS", "Todos");

  const semanaSelect = document.getElementById("filtroSemana");
  const current = semanaSelect.value || "TODAS";
  semanaSelect.innerHTML = `<option value="TODAS">Todas</option>` +
    weeksAvailable.map(w => `<option value="${w}">Semana ${w}</option>`).join("");
  semanaSelect.value = weeksAvailable.map(String).includes(current) ? current : "TODAS";
}
