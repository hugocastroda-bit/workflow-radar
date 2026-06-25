import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = new Set(['Owner', 'Admin', 'User']);

async function canManageCompany(base44, user, empresaId) {
  if (user?.role === 'admin') return true;
  const memberships = await base44.asServiceRole.entities.UsuarioEmpresa.filter({
    usuarioId: user.id,
    empresaId,
    estado: 'Activo',
  });
  return memberships.some((m) => m.rol === 'Owner');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, empresaId, usuarioId, membresiaId, rol, estado, email } = await req.json();
    if (!action || !empresaId) {
      return Response.json({ error: 'action and empresaId are required' }, { status: 400 });
    }

    const allowed = await canManageCompany(base44, user, empresaId);
    if (!allowed) {
      return Response.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
    }

    if (action === 'list') {
      const [users, membresias] = await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.UsuarioEmpresa.filter({ empresaId }),
      ]);
      return Response.json({ users, membresias });
    }

    if (action === 'invite') {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return Response.json({ error: 'Valid email is required' }, { status: 400 });
      }
      const companyRole = ALLOWED_ROLES.has(rol) ? rol : 'User';
      await base44.users.inviteUser(normalizedEmail, 'user');
      const users = await base44.asServiceRole.entities.User.list();
      const invitedUser = users.find((u) => String(u.email || '').toLowerCase() === normalizedEmail);
      if (invitedUser) {
        const existing = await base44.asServiceRole.entities.UsuarioEmpresa.filter({
          usuarioId: invitedUser.id,
          empresaId,
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.UsuarioEmpresa.create({
            usuarioId: invitedUser.id,
            empresaId,
            rol: companyRole,
            estado: 'Activo',
            fechaAsignacion: new Date().toISOString().split('T')[0],
            asignadoPor: user.email || user.id,
          });
        }
      }
      return Response.json({ success: true });
    }

    if (action === 'assign') {
      if (!usuarioId) return Response.json({ error: 'usuarioId is required' }, { status: 400 });
      const companyRole = ALLOWED_ROLES.has(rol) ? rol : 'User';
      const existing = await base44.asServiceRole.entities.UsuarioEmpresa.filter({ usuarioId, empresaId });
      if (existing.length > 0) {
        return Response.json({ error: 'User is already assigned to this company' }, { status: 409 });
      }
      const created = await base44.asServiceRole.entities.UsuarioEmpresa.create({
        usuarioId,
        empresaId,
        rol: companyRole,
        estado: 'Activo',
        fechaAsignacion: new Date().toISOString().split('T')[0],
        asignadoPor: user.email || user.id,
      });
      return Response.json({ success: true, membresia: created });
    }

    if (action === 'remove') {
      if (!membresiaId) return Response.json({ error: 'membresiaId is required' }, { status: 400 });
      await base44.asServiceRole.entities.UsuarioEmpresa.delete(membresiaId);
      return Response.json({ success: true });
    }

    if (action === 'updateRole') {
      if (!membresiaId || !ALLOWED_ROLES.has(rol)) {
        return Response.json({ error: 'membresiaId and valid rol are required' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.UsuarioEmpresa.update(membresiaId, { rol });
      return Response.json({ success: true, membresia: updated });
    }

    if (action === 'updateEstado') {
      if (!membresiaId || !['Activo', 'Inactivo'].includes(estado)) {
        return Response.json({ error: 'membresiaId and valid estado are required' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.UsuarioEmpresa.update(membresiaId, { estado });
      return Response.json({ success: true, membresia: updated });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[manageCompanyMember] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
