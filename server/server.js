
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const BASE_FILE = path.join(DATA_DIR, "base-actual.csv");
const BACKUP_FILE = path.join(DATA_DIR, "base-anterior.csv");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BASE_FILE)) fs.writeFileSync(BASE_FILE, "", "utf8");

// Sirve index.html, css/, js/ (la carpeta del proyecto, un nivel arriba de /server)
app.use(express.static(path.join(__dirname, "..")));
app.use(express.text({ type: "*/*", limit: "10mb" }));

app.get("/api/base", (req, res) => {
  const csv = fs.readFileSync(BASE_FILE, "utf8");
  res.type("text/plain").send(csv);
});

app.post("/api/base", (req, res) => {
  const csv = req.body;

  if (!csv || typeof csv !== "string" || !csv.trim()) {
    return res.status(400).json({ ok: false, error: "CSV vacío o inválido." });
  }

  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return res.status(400).json({ ok: false, error: "El CSV no contiene registros." });
  }

  const headers = lines[0].split(",").map(h => h.trim());
  if (!headers.includes("Unidad de Negocio") || !headers.includes("Modelo Planeación")) {
    return res.status(400).json({
      ok: false,
      error: "Faltan columnas obligatorias: 'Unidad de Negocio' y/o 'Modelo Planeación'.",
    });
  }

  // Respaldo de la base anterior antes de reemplazar
  if (fs.existsSync(BASE_FILE)) {
    fs.copyFileSync(BASE_FILE, BACKUP_FILE);
  }

  fs.writeFileSync(BASE_FILE, csv, "utf8");
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Vento Dashboard corriendo en puerto ${PORT}`);
});