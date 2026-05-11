import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIPOS_HABILITADOS = ["asignado", "bloqueado", "vencido", "cerrado"];

function buildEmail(tipo, pedido, responsableEmail, solicitanteEmail) {
  const emails = [];

  if (tipo === "asignado" && responsableEmail) {
    emails.push({
      to: responsableEmail,
      subject: `Nuevo pedido asignado: ${pedido.titulo}`,
      body: `Hola ${pedido.responsable},\n\nSe te ha asignado un nuevo pedido en Radar Gestión Humana.\n\nPedido: ${pedido.titulo}\nSolicitante: ${pedido.solicitante}\nProceso: ${pedido.proceso}\nPrioridad: ${pedido.prioridad}\nFecha requerida: ${pedido.fecha_requerida || "—"}\n\nPor favor, ingresa a Radar Gestión Humana para revisar el detalle y actualizar el avance.`,
    });
  }

  if (tipo === "bloqueado") {
    const destinatarios = [];
    if (responsableEmail) destinatarios.push({ to: responsableEmail, nombre: pedido.responsable });
    if (solicitanteEmail && solicitanteEmail !== responsableEmail) destinatarios.push({ to: solicitanteEmail, nombre: pedido.solicitante });
    for (const d of destinatarios) {
      emails.push({
        to: d.to,
        subject: `Pedido bloqueado: ${pedido.titulo}`,
        body: `Hola ${d.nombre},\n\nEl siguiente pedido ha sido marcado como bloqueado:\n\nPedido: ${pedido.titulo}\nResponsable: ${pedido.responsable || "—"}\nSolicitante: ${pedido.solicitante}\nProceso: ${pedido.proceso}\nMotivo de bloqueo: ${pedido.motivo_bloqueo || "Sin especificar"}\n\nPor favor, revisar las acciones necesarias para destrabar el avance.`,
      });
    }
  }

  if (tipo === "vencido" && responsableEmail) {
    emails.push({
      to: responsableEmail,
      subject: `Pedido vencido: ${pedido.titulo}`,
      body: `Hola ${pedido.responsable},\n\nEl siguiente pedido figura como vencido:\n\nPedido: ${pedido.titulo}\nProceso: ${pedido.proceso}\nPrioridad: ${pedido.prioridad}\nFecha requerida: ${pedido.fecha_requerida}\n\nPor favor, revisa el pedido y actualiza su estado o fecha requerida si corresponde.`,
    });
  }

  if (tipo === "cerrado" && solicitanteEmail) {
    emails.push({
      to: solicitanteEmail,
      subject: `Pedido cerrado: ${pedido.titulo}`,
      body: `Hola ${pedido.solicitante},\n\nEl siguiente pedido ha sido cerrado:\n\nPedido: ${pedido.titulo}\nResponsable: ${pedido.responsable || "—"}\nProceso: ${pedido.proceso}\nResultado final: ${pedido.resultado_final || "—"}\n\nGracias.`,
    });
  }

  return emails;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tipo, pedidoId } = await req.json();

    if (!tipo || !pedidoId || !TIPOS_HABILITADOS.includes(tipo)) {
      return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    // Fetch pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedidoId);
    if (!pedido) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });

    // Skip if archived
    if (pedido.archivado) return Response.json({ skipped: true, reason: "archivado" });
    // Skip cerrado notifications if not actually closed (except for the cerrado event itself)
    if (tipo !== "cerrado" && pedido.estado === "Cerrado") return Response.json({ skipped: true, reason: "cerrado" });

    // Check config
    const configs = await base44.asServiceRole.entities.ConfigNotificaciones.list();
    const config = configs[0] || {};
    const configKey = `notif_${tipo}`;
    if (config[configKey] === false) {
      return Response.json({ skipped: true, reason: "deshabilitado en config" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get catalog emails by nombre (primary lookup)
    let responsableEmail = null;
    let solicitanteEmail = null;
    
    try {
      const responsables = await base44.asServiceRole.entities.Responsable.list();
      const resp = responsables.find(r => (r.nombre || "").trim() === (pedido.responsable || "").trim());
      responsableEmail = resp?.email || null;
    } catch (e) {
      console.warn(`[sendNotificacion] Error buscando responsable: ${e.message}`);
    }
    
    try {
      const solicitantes = await base44.asServiceRole.entities.Solicitante.list();
      const sol = solicitantes.find(s => (s.nombre || "").trim() === (pedido.solicitante || "").trim());
      solicitanteEmail = sol?.email || null;
    } catch (e) {
      console.warn(`[sendNotificacion] Error buscando solicitante: ${e.message}`);
    }

    const emailsToSend = buildEmail(tipo, pedido, responsableEmail, solicitanteEmail);

    if (emailsToSend.length === 0) {
      console.warn(`[sendNotificacion] Sin destinatarios para tipo=${tipo}, pedidoId=${pedidoId}`);
      return Response.json({ skipped: true, reason: "sin_emails_registrados" });
    }

    const results = [];

    for (const emailData of emailsToSend) {
      // Dedup check
      const existingLogs = await base44.asServiceRole.entities.NotificacionLog.filter({
        pedido_id: pedidoId,
        tipo,
        destinatario: emailData.to,
        ...(tipo === "vencido" ? { fecha_envio: today } : {}),
      });

      if (existingLogs.length > 0) {
        results.push({ to: emailData.to, status: "omitido_duplicado" });
        continue;
      }

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          from_name: "Radar Gesti\u00f3n Humana",
        });

        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedidoId,
          tipo,
          destinatario: emailData.to,
          fecha_envio: today,
          estado_envio: "enviado",
        });

        results.push({ to: emailData.to, status: "enviado" });
      } catch (err) {
        console.error(`[sendNotificacion] Error enviando a ${emailData.to}:`, err.message);
        await base44.asServiceRole.entities.NotificacionLog.create({
          pedido_id: pedidoId,
          tipo,
          destinatario: emailData.to,
          fecha_envio: today,
          estado_envio: "error",
          error: err.message,
        });
        results.push({ to: emailData.to, status: "error", error: err.message });
      }
    }

    return Response.json({ ok: true, results });
  } catch (error) {
    console.error("[sendNotificacion] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});