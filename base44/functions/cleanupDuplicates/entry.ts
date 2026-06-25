import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Solo admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const responsables = await base44.entities.Responsable.list();
    const pedidos = await base44.entities.Pedido.list();
    
    // Agrupar por email normalizado
    const groupsByEmail = {};
    responsables.forEach(r => {
      const norm = normalizeEmail(r.email);
      if (norm) {
        if (!groupsByEmail[norm]) groupsByEmail[norm] = [];
        groupsByEmail[norm].push(r);
      }
    });

    let duplicadosEncontrados = 0;
    let duplicadosEliminados = 0;
    let duplicadosInactivados = 0;
    const requiereRevision = [];

    // Procesar duplicados
    for (const [email, group] of Object.entries(groupsByEmail)) {
      if (group.length <= 1) continue;

      duplicadosEncontrados += group.length - 1;

      // Ordenar: preferir activos con nombre, luego recientes
      group.sort((a, b) => {
        if (a.activo !== b.activo) return b.activo ? 1 : -1;
        if ((a.nombre || '').length !== (b.nombre || '').length) {
          return (b.nombre || '').length - (a.nombre || '').length;
        }
        return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
      });

      const principal = group[0];
      const duplicados = group.slice(1);

      for (const dup of duplicados) {
        // Verificar si tiene pedidos
        const pedidosAsociados = pedidos.filter(p => 
          (p.responsable || '').toLowerCase() === (dup.nombre || '').toLowerCase()
        );

        if (pedidosAsociados.length > 0) {
          // Redirigir pedidos al principal
          for (const p of pedidosAsociados) {
            await base44.entities.Pedido.update(p.id, { responsable: principal.nombre });
          }
          // Inactivar duplicado
          await base44.entities.Responsable.update(dup.id, { activo: false });
          duplicadosInactivados++;
        } else {
          // Sin uso, puede eliminarse
          try {
            await base44.entities.Responsable.delete(dup.id);
            duplicadosEliminados++;
          } catch (err) {
            requiereRevision.push({
              id: dup.id,
              email: email,
              razon: `No se pudo eliminar: ${err.message}`
            });
          }
        }
      }
    }

    return Response.json({
      status: 'success',
      responsablesRevisados: responsables.length,
      duplicadosEncontrados,
      duplicadosEliminados,
      duplicadosInactivados,
      requiereRevision
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});