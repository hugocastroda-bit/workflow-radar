/**
 * Sanitiza una URL proporcionada por el usuario.
 * Solo permite URLs que comiencen con http:// o https://
 * Rechaza javascript:, data:, vbscript: y otros esquemas peligrosos.
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  // Solo permitir http/https
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }
  return "";
}

/**
 * Valida que un string no exceda un largo máximo.
 * Útil para prevenir abuso de almacenamiento.
 */
export function validateMaxLength(value, max = 5000) {
  if (!value || typeof value !== "string") return true;
  return value.length <= max;
}

/**
 * Trunca un string al largo máximo permitido.
 */
export function truncateText(value, max = 5000) {
  if (!value || typeof value !== "string") return value || "";
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Sanitiza texto plano eliminando caracteres nulos y
 * limitando longitud para prevenir ataques de denegación de servicio.
 */
export function sanitizeText(value, maxLength = 10000) {
  if (!value || typeof value !== "string") return "";
  // Eliminar caracteres nulos (pueden causar problemas en algunas DB)
  const cleaned = value.replace(/\0/g, "");
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}