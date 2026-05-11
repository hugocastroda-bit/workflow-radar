import { base44 } from '@/api/base44Client';

// Normalize email: lowercase + trim
export function normalizarCorreo(email) {
  return (email || '').toLowerCase().trim();
}

// Get active Responsables - deduplicated by email, always return fresh from DB
export async function obtenerResponsablesActivos() {
  try {
    // Siempre consultar directamente de la BD para evitar caché antigua
    const responsablesTable = await base44.entities.Responsable.filter(
      { activo: true },
      'nombre'
    );

    // Deduplicar por email normalizado - tomar primero encontrado
    const seenEmails = {};
    const resultado = [];

    for (const r of responsablesTable) {
      if (!r.nombre || !r.nombre.trim()) continue;
      const emailNorm = normalizarCorreo(r.email || '');
      
      // Si ya vimos este email, saltar (evitar duplicados)
      if (emailNorm && seenEmails[emailNorm]) continue;
      
      if (emailNorm) seenEmails[emailNorm] = true;
      
      // Retornar objeto con nombre único (para usar en desplegable)
      resultado.push({
        nombre: r.nombre.trim(),
        display: r.email ? `${r.nombre.trim()} — ${r.email}` : r.nombre.trim(),
        email: r.email || ''
      });
    }

    return resultado;
  } catch (err) {
    console.error('[syncUtils] Error obteniendo responsables:', err);
    return [];
  }
}