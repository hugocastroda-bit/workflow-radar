import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const pedidoId = body?.event?.entity_id;
    const pedido = body?.data;

    if (!pedidoId || !pedido?.responsable) {
      return Response.json({ skipped: true, reason: 'Sin responsable asignado' });
    }

    // Verificar si notificaciones de asignación están activas
    const configs = await base44.asServiceRole.entities.ConfigNotificaciones.list();
    const config = configs[0];
    if (config && config.notif_asignado === false) {
      return Response.json({ skipped: true, reason: 'Notificación de asignación desactivada' });
    }

    // Buscar el email del responsable
    const responsables = await base44.asServiceRole.entities.Responsable.filter({ nombre: pedido.responsable });
    const responsable = responsables[0];

    if (!responsable?.email) {
      return Response.json({ skipped: true, reason: 'Responsable sin email registrado' });
    }

    // Construir el correo
    const fechaRequerida = pedido.fecha_requerida
      ? new Date(pedido.fecha_requerida).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'No especificada';

    const emailBody = `
Hola ${pedido.responsable},

Se te ha asignado un nuevo pedido en Radar Gestión Humana.

📋 Pedido: ${pedido.titulo}
👤 Solicitante: ${pedido.solicitante}
🏢 Proceso: ${pedido.proceso}
⚡ Prioridad: ${pedido.prioridad}
📅 Fecha requerida: ${fechaRequerida}
${pedido.descripcion ? `\n📝 Descripción: ${pedido.descripcion}` : ''}

Por favor ingresa al sistema para revisar los detalles y comenzar la atención.

Saludos,
Radar Gestión Humana
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: responsable.email,
      subject: `[Radar GH] Nuevo pedido asignado: ${pedido.titulo}`,
      body: emailBody,
    });

    // Registrar log
    await base44.asServiceRole.entities.NotificacionLog.create({
      pedido_id: pedidoId,
      tipo: 'asignado',
      destinatario: responsable.email,
      fecha_envio: new Date().toISOString().split('T')[0],
      estado_envio: 'enviado',
    });

    return Response.json({ success: true, destinatario: responsable.email });
  } catch (error) {
    console.error('Error enviando notificación de asignación:', error);

    // Intentar registrar el error en el log
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      if (body?.event?.entity_id) {
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: body.event.entity_id,
          tipo: 'asignado',
          destinatario: '',
          fecha_envio: new Date().toISOString().split('T')[0],
          estado_envio: 'error',
          error: error.message,
        });
      }
    } catch (_) {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});