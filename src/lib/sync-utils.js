import { base44 } from '@/api/base44Client';

// Normalize email: lowercase + trim
export function normalizarCorreo(email) {
  return (email || '').toLowerCase().trim();
}

// Get active Responsables - deduplicated by email
export async function obtenerResponsablesActivos() {
  try {
    const responsablesTable = await base44.entities.Responsable.filter(
      { activo: true },
      'nombre'
    );

    // Deduplicar por email normalizado - tomar primero encontrado
    const seenEmails = {};
    const resultado = [];

    for (const r of responsablesTable) {
      if (!r.nombre) continue;
      const emailNorm = normalizarCorreo(r.email || '');
      
      // Si ya vimos este email, saltar
      if (emailNorm && seenEmails[emailNorm]) continue;
      
      if (emailNorm) seenEmails[emailNorm] = true;
      
      const display = r.email ? `${r.nombre} — ${r.email}` : r.nombre;
      resultado.push({
        nombre: r.nombre,
        display: display,
        email: r.email
      });
    }

    return resultado;
  } catch (err) {
    console.error('[syncUtils] Error obteniendo responsables:', err);
    return [];
  }
}