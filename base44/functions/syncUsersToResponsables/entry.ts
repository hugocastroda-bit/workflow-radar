import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Normaliza correo: minúsculas + sin espacios al inicio/final
function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Solo admin puede sincronizar
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Obtener todos los usuarios (usar service role para listar)
    const users = await base44.asServiceRole.entities.User.list();
    
    // 2. Obtener todos los responsables existentes
    const responsables = await base44.asServiceRole.entities.Responsable.list();
    
    // 3. Crear mapas por correo normalizado para búsqueda rápida
    const respByEmailNorm = {};
    responsables.forEach(r => {
      const normalized = normalizeEmail(r.email);
      if (normalized && !respByEmailNorm[normalized]) {
        respByEmailNorm[normalized] = r;
      }
    });
    
    let usuariosRevisados = 0;
    let responsablesCreados = 0;
    let responsablesActualizados = 0;
    const errores = [];

    // 4. Por cada usuario, crear o actualizar responsable
    for (const usuario of users) {
      usuariosRevisados++;
      
      if (!usuario.email || !usuario.full_name) {
        errores.push(`Usuario ${usuario.id} sin email o nombre completo`);
        continue;
      }

      const emailNorm = normalizeEmail(usuario.email);
      const existingResp = respByEmailNorm[emailNorm];

      try {
        if (existingResp) {
          // Ya existe responsable con este correo
          // Actualizar nombre, email normalizado y estado
          const needsUpdate = 
            existingResp.nombre !== usuario.full_name ||
            normalizeEmail(existingResp.email) !== emailNorm ||
            existingResp.activo !== true;
          
          if (needsUpdate) {
           await base44.asServiceRole.entities.Responsable.update(existingResp.id, {
             nombre: usuario.full_name,
             email: emailNorm,
             rol_funcion: usuario.role || 'user',
             activo: true
           });
            responsablesActualizados++;
            respByEmailNorm[emailNorm] = { ...existingResp, nombre: usuario.full_name, activo: true };
          }
        } else {
          // No existe, crear nuevo
          const newResp = await base44.asServiceRole.entities.Responsable.create({
            nombre: usuario.full_name,
            email: emailNorm,
            rol_funcion: usuario.role || 'user',
            activo: true
          });
          respByEmailNorm[emailNorm] = newResp;
          responsablesCreados++;
        }
      } catch (err) {
        errores.push(`Error procesando usuario ${usuario.email}: ${err.message}`);
      }
    }

    return Response.json({
      status: 'success',
      usuariosRevisados,
      responsablesCreados,
      responsablesActualizados,
      errores
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});