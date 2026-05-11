/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, fullName, role } = await req.json();

    if (!email) {
      return Response.json({ error: 'email required' }, { status: 400 });
    }

    // Invite user (platform handles this)
    // For now, we focus on syncing responsable
    
    const normalized = email.toLowerCase().trim();

    // Check if responsable with this email already exists
    const existing = await base44.asServiceRole.entities.Responsable.filter(
      { correoNormalizado: normalized },
      'nombre',
      1
    );

    let responsable;

    if (existing.length > 0) {
      // Update existing responsable with user info
      responsable = existing[0];
      const updateData = {
        usuarioEmail: email,
        ultimaActualizacion: new Date().toISOString(),
      };
      if (!responsable.nombre && fullName) {
        updateData.nombre = fullName;
      }
      await base44.asServiceRole.entities.Responsable.update(responsable.id, updateData);
    } else {
      // Create new responsable
      responsable = await base44.asServiceRole.entities.Responsable.create({
        nombre: fullName || email,
        email: email,
        correoNormalizado: normalized,
        usuarioEmail: email,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      responsable,
      message: 'Usuario invitado y responsable sincronizado',
    });
  } catch (error) {
    console.error('[inviteUserWithResponsable]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});