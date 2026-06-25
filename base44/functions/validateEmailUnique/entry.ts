import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { correo, excludeUserId } = await req.json();
    
    if (!correo) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const emailNorm = normalizeEmail(correo);

    // Verificar en User
    const users = await base44.entities.User.list();
    const userExistente = users.find(u => 
      u.id !== excludeUserId && 
      normalizeEmail(u.email) === emailNorm
    );

    if (userExistente) {
      return Response.json({
        unique: false,
        duplicateType: 'user',
        message: 'Este correo ya está registrado en otro usuario'
      });
    }

    // Verificar en Responsable
    const responsables = await base44.entities.Responsable.list();
    const responsableExistente = responsables.find(r => 
      normalizeEmail(r.email) === emailNorm
    );

    if (responsableExistente) {
      return Response.json({
        unique: false,
        duplicateType: 'responsable',
        message: 'Este correo ya está registrado en Responsables'
      });
    }

    return Response.json({
      unique: true,
      emailNorm: emailNorm
    });
  } catch (error) {
    console.error('[validateEmailUnique] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});