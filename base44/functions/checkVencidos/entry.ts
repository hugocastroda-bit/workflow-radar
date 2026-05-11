import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];

    // Check if vencido notifications are enabled
    const configs = await base44.asServiceRole.entities.ConfigNotificaciones.list();
    const config = configs[0] || {};
    if (config.notif_vencido === false) {
      return Response.json({ skipped: true, reason: "notif_vencido deshabilitado" });
    }

    // Get all non-archived, non-closed pedidos
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({ archivado: false });
    const vencidos = pedidos.filter(p =>
      p.fecha_requerida && p.fecha_requerida < today && p.estado !== "Cerrado"
    );

    if (vencidos.length === 0) return Response.json({ ok: true, processed: 0 });

    // Get catalog for emails
    const [responsables, solicitantes] = await Promise.all([
      base44.asServiceRole.entities.Responsable.list(),
      base44.asServiceRole.entities.Solicitante.list(),
    ]);
    const respEmailMap = Object.fromEntries(responsables.map(r => [r.nombre, r.email]).filter(([, e]) => e));

    let sent = 0;
    for (const pedido of vencidos) {
      if (!pedido.responsable) continue;
      const responsableEmail = respEmailMap[pedido.responsable];
      if (!responsableEmail) continue;

      // Dedup: one per pedido per day
      const existing = await base44.asServiceRole.entities.NotificacionLog.filter({
        pedido_id: pedido.id,
        tipo: "vencido",
        fecha_envio: today,
      });
      if (existing.length > 0) continue;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: responsableEmail,
          subject: `Pedido vencido: ${pedido.titulo}`,
          body: `Hola ${pedido.responsable},\n\nEl siguiente pedido figura como vencido:\n\nPedido: ${pedido.titulo}\nProceso: ${pedido.proceso}\nPrioridad: ${pedido.prioridad}\nFecha requerida: ${pedido.fecha_requerida}\n\nPor favor, revisa el pedido y actualiza su estado o fecha requerida si corresponde.`,
          from_name: "Radar C&T",
        });
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedido.id,
          tipo: "vencido",
          destinatario: responsableEmail,
          fecha_envio: today,
          estado_envio: "enviado",
        });
        sent++;
      } catch (err) {
        console.error(`[checkVencidos] Error para pedido ${pedido.id}:`, err.message);
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedido.id,
          tipo: "vencido",
          destinatario: responsableEmail,
          fecha_envio: today,
          estado_envio: "error",
          error: err.message,
        });
      }
    }

    return Response.json({ ok: true, vencidos: vencidos.length, sent });
  } catch (error) {
    console.error("[checkVencidos] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});