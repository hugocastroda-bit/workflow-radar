// Constantes compartidas para el sistema de pedidos
// Usadas por PedidoForm, CargaMasiva y otros componentes

export const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

export const PRIORIDADES = ["Alta", "Media", "Baja"];
export const COMPLEJIDADES = ["Simple", "Media", "Alta"];
export const RIESGOS = ["Bajo", "Medio", "Alto"];

export const ENUMS = {
  "Complejidad": COMPLEJIDADES,
  "Riesgo": RIESGOS,
  "Prioridad": PRIORIDADES,
  "Estado": ESTADOS,
};

export const REQUIRED_FIELDS = ["Título", "Solicitante", "Proceso", "Prioridad"];
export const BOOLEAN_FIELDS = ["Confidencial"];

// Columnas para carga masiva (Excel)
export const CARGA_MASIVA_COLS = [
  "Título", "Solicitante", "Proceso", "Prioridad", "Responsable",
  "Fecha requerida", "Complejidad", "Riesgo", "Horas estimadas",
  "Horas reales", "Fecha compromiso", "Descripción", "Estado",
  "Confidencial", "Próxima acción", "Motivo bloqueo",
  "Comentarios avance", "Link evidencia"
];

// Sugerencia de minutos por combinación Prioridad|Complejidad
export const COMPLEJIDAD_MINUTOS = {
  "Alta|Simple": 30, "Alta|Media": 60, "Alta|Alta": 120,
  "Media|Simple": 15, "Media|Media": 45, "Media|Alta": 90,
  "Baja|Simple": 10, "Baja|Media": 30, "Baja|Alta": 60,
};

// Convierte minutos a formato legible "Xh Ym"
export function formatMinutos(minutos) {
  if (minutos == null || isNaN(minutos)) return "";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}