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
      ? new Date(pedido.fecha_requerida + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'No especificada';

    const prioridadColor = pedido.prioridad === 'Alta' ? '#FF3B30' : pedido.prioridad === 'Media' ? '#FF9500' : '#34C759';
    const nombreCorto = pedido.responsable?.split(' ')[0] || pedido.responsable;

    const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F5F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F5F7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0052D4 0%,#4364F7 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;font-weight:600;">Radar Gestión Humana</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Nuevo pedido asignado</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
          <p style="margin:0 0 24px;font-size:16px;color:#1D1D1F;">Hola <strong>${nombreCorto}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">Se te ha asignado un nuevo pedido. Por favor revisa los detalles a continuación y comienza la atención.</p>

          <!-- Card pedido -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;border-bottom:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Pedido</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${pedido.titulo}</p>
            </td></tr>
            <tr><td style="padding:16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:6px 0;vertical-align:top;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Solicitante</p>
                    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">${pedido.solicitante || '—'}</p>
                  </td>
                  <td width="50%" style="padding:6px 0;vertical-align:top;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Proceso</p>
                    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">${pedido.proceso || '—'}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:10px 0 6px;vertical-align:top;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Prioridad</p>
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;background-color:${prioridadColor}18;color:${prioridadColor};font-size:13px;font-weight:600;">${pedido.prioridad || '—'}</span>
                  </td>
                  <td width="50%" style="padding:10px 0 6px;vertical-align:top;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Fecha requerida</p>
                    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">${fechaRequerida}</p>
                  </td>
                </tr>
                ${pedido.descripcion ? `<tr><td colspan="2" style="padding:10px 0 6px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Descripción</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${pedido.descripcion}</p>
                </td></tr>` : ''}
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:14px;color:#6B7280;text-align:center;">Ingresa al sistema para gestionar este pedido</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#9CA3AF;">Este mensaje fue generado automáticamente por <strong style="color:#6B7280;">Radar Gestión Humana</strong>. Por favor no respondas a este correo.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: responsable.email,
      subject: `Nuevo pedido asignado: ${pedido.titulo}`,
      body: htmlBody,
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