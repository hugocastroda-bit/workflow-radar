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

    const { action, empresaId, usuarioId, membresiaId, rol, estado, email, appUrl } = await req.json();
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
      const users = await base44.asServiceRole.entities.User.list();
      const invitedUser = users.find((u) => String(u.email || '').toLowerCase() === normalizedEmail);

      if (invitedUser) {
        // User already exists — assign directly to the company
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
        return Response.json({ success: true, existed: true });
      }

      // User doesn't exist — create a pending invitation and send a custom email
      // so the invitee registers with the default password (prueba1234) and is
      // auto-assigned to the company upon registration.
      const existingPendiente = await base44.asServiceRole.entities.InvitacionPendiente.filter({
        email: normalizedEmail,
        empresaId,
        estado: 'Pendiente',
      });
      if (existingPendiente.length === 0) {
        await base44.asServiceRole.entities.InvitacionPendiente.create({
          email: normalizedEmail,
          empresaId,
          rol: companyRole,
          estado: 'Pendiente',
          fechaInvitacion: new Date().toISOString().split('T')[0],
          invitadoPor: user.email || user.id,
        });
      }

      const empresa = await base44.asServiceRole.entities.Empresa.get(empresaId);
      const nombreEmpresa = empresa?.nombreEmpresa || 'la empresa';
      const origin = String(appUrl || '').trim().replace(/\/$/, '');
      const registerUrl = origin
        ? `${origin}/register?email=${encodeURIComponent(normalizedEmail)}`
        : `/register?email=${encodeURIComponent(normalizedEmail)}`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: normalizedEmail,
          subject: `Invitación a Workflow Radar — ${nombreEmpresa}`,
          body: [
            `Hola,`,
            ``,
            `${user.full_name || user.email} te ha invitado a unirte a ${nombreEmpresa} en Workflow Radar.`,
            ``,
            `Para activar tu cuenta:`,
            `1. Ingresa a ${registerUrl}`,
            `2. Regístrate con tu correo ${normalizedEmail}`,
            `3. Usa la contraseña por defecto: prueba1234`,
            ``,
            `Una vez registrado, quedarás automáticamente asignado a la empresa.`,
            ``,
            `Saludos,`,
            `Equipo Workflow Radar`,
          ].join('\n'),
        });
      } catch (emailErr) {
        console.error('[manageCompanyMember] SendEmail error:', emailErr);
      }

      return Response.json({ success: true, invited: true });
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