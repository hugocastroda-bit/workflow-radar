import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory rate limiting: Map<"email:espacioId", { count, firstAt }>
const intentos = new Map();
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { espacioId, clave } = body;

    if (!espacioId || !clave) {
      return Response.json({ error: 'Parámetros incompletos.' }, { status: 400 });
    }

    // Rate limiting check
    const ratKey = `${user.email}:${espacioId}`;
    const now = Date.now();
    const record = intentos.get(ratKey);

    if (record && record.count >= MAX_INTENTOS && (now - record.firstAt) < BLOQUEO_MS) {
      return Response.json({
        valido: false,
        bloqueado: true,
        message: 'Demasiados intentos fallidos. Inténtalo nuevamente más tarde.'
      }, { status: 429 });
    }

    // Reset if lockout period expired
    if (record && (now - record.firstAt) >= BLOQUEO_MS) {
      intentos.delete(ratKey);
    }

    // Get the espacio using service role (key hash should not be exposed to frontend)
    const espacio = await base44.asServiceRole.entities.EspacioEquipo.get(espacioId);
    if (!espacio) return Response.json({ error: 'Espacio no encontrado.' }, { status: 404 });

    if (!espacio.requiereClave || !espacio.claveAccesoHash) {
      return Response.json({ valido: true });
    }

    // Hash the provided key with SHA-256
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(clave));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hashHex !== espacio.claveAccesoHash) {
      // Increment failed attempts
      const current = intentos.get(ratKey) || { count: 0, firstAt: now };
      intentos.set(ratKey, { count: current.count + 1, firstAt: current.firstAt });
      return Response.json({ valido: false, message: 'La clave del espacio no es correcta.' });
    }

    // Success — clear rate limit
    intentos.delete(ratKey);
    return Response.json({ valido: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});