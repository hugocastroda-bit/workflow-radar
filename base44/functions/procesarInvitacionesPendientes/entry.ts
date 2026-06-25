import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = String(user.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ procesadas: 0 });
    }

    const pendientes = await base44.asServiceRole.entities.InvitacionPendiente.filter({
      email,
      estado: 'Pendiente',
    });

    let procesadas = 0;
    for (const inv of pendientes) {
      const existing = await base44.asServiceRole.entities.UsuarioEmpresa.filter({
        usuarioId: user.id,
        empresaId: inv.empresaId,
      });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.UsuarioEmpresa.create({
          usuarioId: user.id,
          empresaId: inv.empresaId,
          rol: inv.rol,
          estado: 'Activo',
          fechaAsignacion: new Date().toISOString().split('T')[0],
          asignadoPor: inv.invitadoPor || user.email,
        });
      }
      await base44.asServiceRole.entities.InvitacionPendiente.update(inv.id, {
        estado: 'Asignada',
      });
      procesadas++;
    }

    return Response.json({ procesadas });
  } catch (error) {
    console.error('[procesarInvitacionesPendientes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});