import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_PLANS = new Set(['Basic', 'Team', 'Pro', 'Business']);
const ALLOWED_STATES = new Set(['Activa', 'Suspendida', 'Prueba']);

function cleanString(value) {
  return String(value || '').trim();
}

function normalizeCompanyPayload(input) {
  const nombreEmpresa = cleanString(input?.nombreEmpresa);
  if (!nombreEmpresa) {
    throw new Error('nombreEmpresa is required');
  }

  const plan = ALLOWED_PLANS.has(input?.plan) ? input.plan : 'Basic';
  const estado = ALLOWED_STATES.has(input?.estado) ? input.estado : 'Prueba';

  return {
    nombreEmpresa,
    ruc: cleanString(input?.ruc) || undefined,
    plan,
    estado,
    limiteUsuarios: Number(input?.limiteUsuarios) || 5,
    creditosMensuales: Number(input?.creditosMensuales) || 5,
    fechaInicio: cleanString(input?.fechaInicio) || undefined,
    fechaFinPrueba: cleanString(input?.fechaFinPrueba) || undefined,
  };
}

async function canManageCompany(base44, user, empresaId) {
  if (user?.role === 'admin') return true;
  const memberships = await base44.asServiceRole.entities.UsuarioEmpresa.filter({
    usuarioId: user.id,
    empresaId,
    rol: 'Admin',
    estado: 'Activo',
  });
  return memberships.length > 0;
}

async function canCreateCompany(base44, user) {
  return user?.role === 'admin';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, empresaId } = body || {};

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'list') {
      const allEmpresas = await base44.asServiceRole.entities.Empresa.list();
      const canCreate = user.role === 'admin' || allEmpresas.length === 0;
      return Response.json({ empresas: allEmpresas, canCreateInitial: canCreate });
    }

    if (action === 'create') {
      const allowed = await canCreateCompany(base44, user);
      if (!allowed) {
        return Response.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
      }

      const payload = normalizeCompanyPayload(body);
      const empresas = await base44.asServiceRole.entities.Empresa.list();
      const duplicate = empresas.find(
        (empresa) => cleanString(empresa.nombreEmpresa).toLowerCase() === payload.nombreEmpresa.toLowerCase()
      );
      if (duplicate) {
        return Response.json({ error: 'Company already exists', empresa: duplicate }, { status: 409 });
      }

      const empresa = await base44.asServiceRole.entities.Empresa.create(payload);
      const membresia = await base44.asServiceRole.entities.UsuarioEmpresa.create({
        usuarioId: user.id,
        empresaId: empresa.id,
        rol: 'Admin',
        estado: 'Activo',
        fechaAsignacion: new Date().toISOString().split('T')[0],
        asignadoPor: user.email || user.id,
      });
      await base44.asServiceRole.entities.User.update(user.id, {
        active_empresa_id: empresa.id,
      });
      return Response.json({ empresa, membresia });
    }

    if (action === 'update') {
      if (!empresaId) {
        return Response.json({ error: 'empresaId is required' }, { status: 400 });
      }

      const allowed = await canManageCompany(base44, user, empresaId);
      if (!allowed) {
        return Response.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
      }

      const payload = normalizeCompanyPayload(body);
      const empresa = await base44.asServiceRole.entities.Empresa.update(empresaId, payload);
      return Response.json({ empresa });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[ownerCompanyAdmin] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});