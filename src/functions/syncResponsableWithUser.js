/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userEmail, userName } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail required' }, { status: 400 });
    }

    const normalized = userEmail.toLowerCase().trim();

    // Check if responsable with this email already exists
    let responsables = await base44.asServiceRole.entities.Responsable.filter(
      { correoNormalizado: normalized },
      'nombre',
      1
    );

    let responsable;

    if (responsables.length > 0) {
      // Update existing responsable
      responsable = responsables[0];
      const updateData = { ultimaActualizacion: new Date().toISOString() };
      if (!responsable.usuarioEmail) {
        updateData.usuarioEmail = userEmail;
      }
      if (!responsable.nombre && userName) {
        updateData.nombre = userName;
      }
      await base44.asServiceRole.entities.Responsable.update(responsable.id, updateData);
    } else {
      // Create new responsable
      responsable = await base44.asServiceRole.entities.Responsable.create({
        nombre: userName || userEmail,
        email: userEmail,
        correoNormalizado: normalized,
        usuarioEmail: userEmail,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
      });
    }

    return Response.json({ responsable });
  } catch (error) {
    console.error('[syncResponsableWithUser]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});