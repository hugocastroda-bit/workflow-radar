import { base44 } from '@/api/base44Client';

// Normalize email: lowercase + trim
export function normalizarCorreo(email) {
  return (email || '').toLowerCase().trim();
}

// Create or link Responsable for a User
export async function sincronizarUsuarioResponsable(usuario) {
  if (!usuario || !usuario.email) return null;

  const correoNorm = normalizarCorreo(usuario.email);
  
  try {
    // Check if Responsable already exists with this email
    const existentes = await base44.entities.Responsable.filter(
      { correoNormalizado: correoNorm }
    );

    if (existentes.length > 0) {
      // Already exists, just ensure it's active
      const responsable = existentes[0];
      if (!responsable.activo) {
        await base44.entities.Responsable.update(responsable.id, { activo: true });
      }
      return responsable;
    }

    // Create new Responsable from User
    const nuevoResponsable = await base44.entities.Responsable.create({
      nombre: usuario.full_name || usuario.email,
      email: usuario.email,
      correoNormalizado: correoNorm,
      activo: true,
    });

    return nuevoResponsable;
  } catch (err) {
    console.error('[syncUtils] Error sincronizando usuario:', err);
    return null;
  }
}

// Get active Responsables (from Users + Responsable table fallback)
export async function obtenerResponsablesActivos() {
  try {
    // Get all Users
    const usuarios = await base44.entities.User.list();
    const responsablesMap = {};

    // Create Responsable entries from Users
    for (const user of usuarios) {
      if (user.email) {
        const correoNorm = normalizarCorreo(user.email);
        const display = `${user.full_name || user.email} — ${user.email}`;
        responsablesMap[correoNorm] = {
          full_name: user.full_name || user.email,
          email: user.email,
          display,
          source: 'user',
        };
      }
    }

    // Add Responsables from table (active only) that don't duplicate
    const responsablesTable = await base44.entities.Responsable.filter(
      { activo: true },
      'nombre'
    );

    for (const r of responsablesTable) {
      if (r.email) {
        const correoNorm = normalizarCorreo(r.email);
        if (!responsablesMap[correoNorm]) {
          const display = r.email ? `${r.nombre} — ${r.email}` : r.nombre;
          responsablesMap[correoNorm] = {
            full_name: r.nombre,
            email: r.email,
            display,
            source: 'responsable_table',
          };
        }
      }
    }

    return Object.values(responsablesMap);
  } catch (err) {
    console.error('[syncUtils] Error obteniendo responsables:', err);
    return [];
  }
}