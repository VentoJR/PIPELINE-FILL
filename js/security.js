/* ============================================================================
   VENTO DASHBOARD — security.js
   Controla el flujo de "Cargar nueva base": pide contraseña antes de
   permitir seleccionar e importar un archivo.

   ACLARACIÓN IMPORTANTE (sección 32 del brief):
   La contraseña implementada en JavaScript del lado del cliente es una
   barrera de interfaz, NO una medida de seguridad de servidor. Cualquier
   persona con acceso al código fuente de este archivo puede leerla o
   sortearla. Para seguridad real (control de acceso auditable, roles,
   etc.) se requiere autenticación en un backend. Esto es intencional en
   este proyecto: el dashboard es una herramienta interna sin backend.
   ---------------------------------------------------------------------- */

let pendingFileInputTrigger = null;

function openPasswordModal(onSuccess) {
  pendingFileInputTrigger = onSuccess;
  const modal = document.getElementById("passwordModal");
  const input = document.getElementById("passwordInput");
  const error = document.getElementById("passwordError");
  input.value = "";
  error.classList.remove("visible");
  modal.classList.remove("hidden");
  input.focus();
}

function closePasswordModal() {
  document.getElementById("passwordModal").classList.add("hidden");
  pendingFileInputTrigger = null;
}

function submitPassword() {
  const input = document.getElementById("passwordInput");
  const error = document.getElementById("passwordError");
  if (input.value === CONFIG.UPDATE_PASSWORD) {
    error.classList.remove("visible");
    const cb = pendingFileInputTrigger;
    closePasswordModal();
    if (cb) cb();
  } else {
    error.textContent = "Contraseña incorrecta. No se puede actualizar la base.";
    error.classList.add("visible");
  }
}

function wireSecurityUI() {
  document.getElementById("btnCargarBase").addEventListener("click", () => {
    openPasswordModal(() => document.getElementById("inputArchivoCSV").click());
  });
  document.getElementById("btnPasswordContinuar").addEventListener("click", submitPassword);
  document.getElementById("btnPasswordCancelar").addEventListener("click", closePasswordModal);
  document.getElementById("passwordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") submitPassword();
    if (e.key === "Escape") closePasswordModal();
  });
}
