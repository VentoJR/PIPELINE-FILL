# Changelog — VENTO Supply Chain Dashboard

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0] — Versión actual

### Agregado
- Dashboard base HTML/CSS/JS modular (sin Excel, sin dependencia de Excel).
- KPIs principales: Forecast, Pedido Revisado, Inventario Cumplido, Pendiente por Entregar, Traslado Completado.
- Sección Forecast vs Pedido Revisado con % de cobertura y semáforo.
- Sección Cumplimiento del Pedido (Inventario Cumplido / Pedido Revisado).
- **Inventario Proyectado vs Cumplido por Semana**: tabla + gráfica combinada (barras + línea de % acumulado), con detección automática de columnas de semana y manejo explícito de "SIN PROYECCIÓN" cuando la base no trae aún la columna de proyección semanal.
- **Ritmo de cumplimiento** (ATRASADO / EN LÍNEA / ADELANTADO) calculado dinámicamente según el número de semanas disponibles, con tolerancia configurable (±5 puntos porcentuales por defecto). No hay semanas hard-codeadas: el sistema acepta semanas 41, 42, 43... automáticamente.
- **Capacidad de Inventario** por unidad de negocio (E-COMMERCE = 1300, DISTRIBUIDORES = 3000, TOTAL = 4300) con gauges tipo velocímetro, evitando doble conteo entre "Inventario Gnrl." y las columnas de almacén (60.3, 17.7, 17.4).
- **DOH — Días de Inventario**: clasificación NORMAL / ALERTA / CRÍTICO / SIN COBERTURA usando exclusivamente el valor actual. Sin histórico, sin tendencias, sin flechas, sin comparación contra semanas anteriores (retirado intencionalmente respecto a iteraciones previas del proyecto).
- Modelos Pendientes por Entregar: gráfica horizontal + tabla, con selector Top 5 / Top 10 / Todos.
- Matriz Ejecutiva ordenable por columna y filtrable.
- Alertas automáticas priorizadas (DOH crítico, sin cobertura, pendientes, ritmo atrasado, capacidad cercana al límite o excedida).
- Resumen Ejecutivo en texto, generado dinámicamente a partir de los datos filtrados.
- Filtros: Unidad de Negocio, Modelo, Modelo Agrupado, Semana, Estatus, búsqueda de texto libre, botón "Limpiar filtros".
- Actualización de base de datos protegida por contraseña (`123` por defecto, configurable), con validación de columnas y mensajes de error claros en caso de contraseña incorrecta o estructura inválida.
- Logo oficial de Vento Motorcycles U.S.A. referenciado por variable (`CONFIG.VENTO_LOGO_URL`), con respaldo visual automático si no carga.
- Diseño responsive (desktop, laptop, tablet, pantallas pequeñas).
- Tooltips explicativos en conceptos técnicos (DOH, Capacidad, Cumplimiento).
- Paleta de colores corporativa (no monocromática) definida por variables CSS, con semáforo verde/amarillo/rojo aplicado únicamente donde ayuda a interpretar un indicador.

### Cambiado respecto a iteraciones anteriores del dashboard
- "Inventario Asignado por Semana" evolucionó a "Inventario Proyectado vs Cumplido por Semana", con acumulado, % de cumplimiento y ritmo.
- Se eliminó por completo cualquier análisis histórico de DOH (tendencia, DOH anterior, incrementos/reducciones, flechas) — ver sección "Eliminado".
- La paleta de colores dejó de ser monocromática y ahora usa una identidad corporativa con semáforo funcional.

### Eliminado
- Sección "Ejemplos — Modelos con Mayor DOH" (versión con comparación histórica).
- Sección "Tendencia DOH".
- Sección "Modelos con Mayor Incremento de DOH".
- Sección "Modelos con Mayor Reducción de DOH".
- Cualquier referencia a "DOH Anterior", tendencia histórica, o mensajes de tipo "Sin datos históricos disponibles".

## [Unreleased] — próximas versiones

Espacio reservado para futuras modificaciones. Sugerencias a considerar:
- Incorporar "Inventario Proyectado Por Semana" en la base real cuando el equipo de datos lo agregue (el dashboard ya está preparado para detectarlo automáticamente).
- Exportar la Matriz Ejecutiva y la tabla de Pendientes a CSV.
- Autenticación real en backend para la actualización de base (más allá de la barrera de interfaz actual).
