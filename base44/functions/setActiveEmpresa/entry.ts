import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { empresaId } = await req.json();
    if (!empresaId) {
      return Response.json({ error: 'empresaId is required' }, { status: 400 });
    }

    const membresias = await base44.asServiceRole.entities.UsuarioEmpresa.filter({
      usuarioId: user.id,
      empresaId,
      estado: 'Activo',
    });

    const membresia = membresias[0];
    if (!membresia) {
      return Response.json({ error: 'Forbidden: user is not active in this company' }, { status: 403 });
    }

    const empresa = await base44.asServiceRole.entities.Empresa.get(empresaId);
    if (!empresa) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      active_empresa_id: empresaId,
    });

    return Response.json({
      empresaId,
      nombre: empresa.nombreEmpresa || 'Empresa',
      plan: empresa.plan || 'Basic',
      rol: membresia.rol,
      membresiaId: membresia.id,
    });
  } catch (error) {
    console.error('[setActiveEmpresa] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
