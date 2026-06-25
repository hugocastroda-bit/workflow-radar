import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ENABLED_STATES = new Set(['Activa', 'Prueba']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { empresaId } = await req.json();
    const cleanEmpresaId = String(empresaId || '').trim();

    if (!cleanEmpresaId) {
      return Response.json({ error: 'empresaId is required' }, { status: 400 });
    }

    const empresa = await base44.asServiceRole.entities.Empresa.get(cleanEmpresaId);
    if (!empresa) {
      return Response.json({ valid: false, reason: 'not_found' }, { status: 404 });
    }

    if (!ENABLED_STATES.has(empresa.estado || '')) {
      return Response.json({ valid: false, reason: 'disabled' }, { status: 403 });
    }

    return Response.json({
      valid: true,
      empresaId: cleanEmpresaId,
      nombre: empresa.nombreEmpresa || 'Empresa',
      estado: empresa.estado || 'Prueba',
    });
  } catch (error) {
    console.error('[validateEmpresaAccess] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
