// DEPRECATED: Espacios y Google Calendar ya no se usan
// Esta función se mantiene por compatibilidad pero ya no se ejecuta

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  return Response.json({ 
    error: 'Esta funcionalidad ha sido desactivada',
    message: 'Google Calendar sync no está activo en esta versión'
  }, { status: 410 });
});