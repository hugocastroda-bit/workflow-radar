// DEPRECATED: Sistema de notificaciones manual reemplazado
// Esta función se mantiene por compatibilidad pero ya no se ejecuta automáticamente

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  return Response.json({ 
    error: 'Esta funcionalidad ha sido desactivada',
    message: 'El sistema de notificaciones automáticas por cambio de estado no está activo'
  }, { status: 410 });
});