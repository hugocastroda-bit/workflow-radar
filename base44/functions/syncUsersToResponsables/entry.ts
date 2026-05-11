import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only Admin can sync
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const usuarios = await base44.asServiceRole.entities.User.list();
    
    let creados = 0;
    let vinculados = 0;
    let errores = [];

    for (const usuario of usuarios) {
      if (!usuario.email) continue;

      const correoNorm = usuario.email.toLowerCase().trim();

      try {
        // Check if Responsable exists
        const existentes = await base44.asServiceRole.entities.Responsable.filter({
          correoNormalizado: correoNorm
        });

        if (existentes.length > 0) {
          // Exists, ensure active
          const responsable = existentes[0];
          if (!responsable.activo) {
            await base44.asServiceRole.entities.Responsable.update(responsable.id, {
              activo: true
            });
            vinculados++;
          }
        } else {
          // Create new
          await base44.asServiceRole.entities.Responsable.create({
            nombre: usuario.full_name || usuario.email,
            email: usuario.email,
            correoNormalizado: correoNorm,
            activo: true,
          });
          creados++;
        }
      } catch (err) {
        errores.push({
          usuario: usuario.email,
          error: err.message
        });
      }
    }

    return Response.json({
      success: true,
      usuariosRevisados: usuarios.length,
      responsablesCreados: creados,
      responsablesVinculados: vinculados,
      errores: errores.length > 0 ? errores : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});