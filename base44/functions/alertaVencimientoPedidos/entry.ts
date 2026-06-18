import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // Permitir ejecución desde automation (sin user) o solo admin
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verificar config de notificaciones
    const configs = await base44.asServiceRole.entities.ConfigNotificaciones.list();
    const config = configs[0];
    if (config && config.notif_vencido === false) {
      return Response.json({ skipped: true, reason: 'Notificación de vencimiento desactivada' });
    }

    // Calcular ventana: pedidos con fecha_requerida en las próximas 24 horas (desde ahora hasta mañana)
    const ahora = new Date();
    // Ajustar a zona horaria Lima (UTC-5)
    const ahoraLima = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
    const hoyStr = ahoraLima.toISOString().split('T')[0];

    // Fecha de mañana en Lima
    const manana = new Date(ahoraLima.getTime() + 24 * 60 * 60 * 1000);
    const mananaStr = manana.toISOString().split('T')[0];

    // Traer pedidos activos que vencen hoy o mañana, no cerrados ni archivados
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({ archivado: false });
    const estadosActivos = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión"];

    const proximosAVencer = pedidos.filter(p => {
      if (!p.fecha_requerida) return false;
      if (!estadosActivos.includes(p.estado)) return false;
      if (!p.responsable) return false;
      return p.fecha_requerida === hoyStr || p.fecha_requerida === mananaStr;
    });

    if (proximosAVencer.length === 0) {
      return Response.json({ success: true, notificados: 0, mensaje: 'Sin pedidos próximos a vencer' });
    }

    // Cargar todos los responsables para mapear nombre → email
    const responsables = await base44.asServiceRole.entities.Responsable.list();
    const emailMap = {};
    for (const r of responsables) {
      if (r.nombre && r.email) emailMap[r.nombre.trim().toUpperCase()] = r.email;
    }

    // Cargar logs de hoy para evitar duplicar notificaciones ya enviadas hoy
    const logsHoy = await base44.asServiceRole.entities.NotificacionLog.filter({
      tipo: 'vencido',
      fecha_envio: hoyStr,
      estado_envio: 'enviado',
    });
    const yaNotificados = new Set(logsHoy.map(l => l.pedido_id));

    let notificados = 0;
    let omitidos = 0;

    for (const pedido of proximosAVencer) {
      // Evitar re-notificar el mismo pedido hoy
      if (yaNotificados.has(pedido.id)) {
        omitidos++;
        continue;
      }

      const nombreNorm = pedido.responsable?.split(' — ')[0]?.trim()?.toUpperCase();
      const responsableObj = responsables.find(r => r.nombre?.trim()?.toUpperCase() === nombreNorm);
      if (responsableObj?.recibe_notificaciones === false) {
        omitidos++;
        continue;
      }
      const email = emailMap[nombreNorm];
      if (!email) {
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedido.id,
          tipo: 'vencido',
          destinatario: '',
          fecha_envio: hoyStr,
          estado_envio: 'omitido',
          error: 'Responsable sin email registrado',
        });
        omitidos++;
        continue;
      }

      const esHoy = pedido.fecha_requerida === hoyStr;
      const fechaFormateada = new Date(pedido.fecha_requerida + 'T12:00:00').toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const prioridadColor = pedido.prioridad === 'Alta' ? '#FF3B30' : pedido.prioridad === 'Media' ? '#FF9500' : '#34C759';
      const nombreCorto = pedido.responsable?.split(' ')[0] || pedido.responsable;
      const urgenciaTexto = esHoy ? '⚠️ ¡VENCE HOY!' : '⏰ Vence mañana';
      const urgenciaColor = esHoy ? '#FF3B30' : '#FF9500';
      const subjectTexto = esHoy
        ? `⚠️ Pedido vence HOY: ${pedido.titulo}`
        : `⏰ Pedido vence mañana: ${pedido.titulo}`;

      const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F5F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F5F7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${urgenciaColor} 0%,${urgenciaColor}CC 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:1px;text-transform:uppercase;font-weight:600;">Radar Gestión Humana</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${urgenciaTexto}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
          <p style="margin:0 0 24px;font-size:16px;color:#1D1D1F;">Hola <strong>${nombreCorto}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            ${esHoy
              ? 'Tienes un pedido que <strong style="color:#FF3B30;">vence hoy</strong>. Por favor atiéndelo a la brevedad posible.'
              : 'Tienes un pedido que <strong style="color:#FF9500;">vence mañana</strong>. Asegúrate de completarlo a tiempo.'
            }
          </p>

          <!-- Alerta de urgencia -->
          <div style="background:${urgenciaColor}10;border:1.5px solid ${urgenciaColor}40;border-radius:8px;padding:12px 16px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;font-size:14px;font-weight:700;color:${urgenciaColor};">Fecha límite: ${fechaFormateada}</p>
          </div>

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
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Estado actual</p>
                    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">${pedido.estado}</p>
                  </td>
                </tr>
                ${pedido.proxima_accion ? `<tr><td colspan="2" style="padding:10px 0 6px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;">Próxima acción registrada</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${pedido.proxima_accion}</p>
                </td></tr>` : ''}
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:14px;color:#6B7280;text-align:center;">Ingresa al sistema para actualizar el estado del pedido</p>
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

      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: subjectTexto,
          body: htmlBody,
        });

        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedido.id,
          tipo: 'vencido',
          destinatario: email,
          fecha_envio: hoyStr,
          estado_envio: 'enviado',
        });

        notificados++;
      } catch (emailErr) {
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedido.id,
          tipo: 'vencido',
          destinatario: email,
          fecha_envio: hoyStr,
          estado_envio: 'error',
          error: emailErr.message,
        });
      }
    }

    return Response.json({ success: true, notificados, omitidos, total: proximosAVencer.length });

  } catch (error) {
    console.error('Error en alerta de vencimiento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});