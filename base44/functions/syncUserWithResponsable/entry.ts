import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { usuarioId, nombre, correo, rol, estado } = await req.json();
    
    if (!usuarioId || !nombre || !correo) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailNorm = normalizeEmail(correo);
    
    // Obtener responsables existentes
    const responsables = await base44.entities.Responsable.list();
    const responsableExistente = responsables.find(r => 
      normalizeEmail(r.email) === emailNorm
    );

    let responsableId = null;
    let accion = null;

    if (responsableExistente) {
      // Actualizar responsable existente
      await base44.entities.Responsable.update(responsableExistente.id, {
        nombre: nombre,
        email: emailNorm,
        rol_funcion: rol || 'user',
        activo: estado === 'active' || estado === true || estado === 'Activo',
      });
      responsableId = responsableExistente.id;
      accion = 'updated';
    } else {
      // Crear responsable nuevo
      const newResp = await base44.entities.Responsable.create({
        nombre: nombre,
        email: emailNorm,
        rol_funcion: rol || 'user',
        activo: estado === 'active' || estado === true || estado === 'Activo',
      });
      responsableId = newResp.id;
      accion = 'created';
    }

    return Response.json({
      status: 'success',
      responsableId: responsableId,
      accion: accion,
      emailNorm: emailNorm,
    });
  } catch (error) {
    console.error('[syncUserWithResponsable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});