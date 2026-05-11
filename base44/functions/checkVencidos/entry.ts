import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory lock to prevent parallel executions
let isRunning = false;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // ─── 1. AUTH: accept either cron secret OR admin user ───────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";

  let authorizedViaCron = false;
  let authorizedViaUser = false;
  let callerLabel = "unknown";

  // Check cron secret first (for scheduled automations)
  if (cronSecret) {
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (bearerToken === cronSecret || cronHeader === cronSecret) {
      authorizedViaCron = true;
      callerLabel = "cron";
    }
  }

  // Check user auth if not cron
  if (!authorizedViaCron) {
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      console.warn(`[checkVencidos] ${now} - Intento no autenticado desde ${req.headers.get("x-forwarded-for") || "desconocido"}`);
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!user) {
      console.warn(`[checkVencidos] ${now} - Solicitud sin sesión`);
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    if (user.role !== "admin") {
      console.warn(`[checkVencidos] ${now} - Acceso denegado a usuario ${user.email} (rol: ${user.role})`);
      return Response.json({ error: "No tienes permisos para ejecutar esta tarea." }, { status: 403 });
    }

    authorizedViaUser = true;
    callerLabel = user.email;
  }

  if (!authorizedViaCron && !authorizedViaUser) {
    return Response.json({ error: "Secreto inválido." }, { status: 403 });
  }

  // ─── 2. LOCK: prevent parallel executions ───────────────────────────────────
  if (isRunning) {
    console.warn(`[checkVencidos] ${now} - Ejecución rechazada: ya hay una en curso`);
    return Response.json({ error: "La tarea ya se está ejecutando." }, { status: 429 });
  }
  isRunning = true;

  try {
    // ─── 3. Check if vencido notifications are enabled ──────────────────────
    const configs = await base44.asServiceRole.entities.ConfigNotificaciones.list();
    const config = configs[0] || {};
    if (config.notif_vencido === false) {
      console.log(`[checkVencidos] ${now} - Saltado: notif_vencido deshabilitado (ejecutado por: ${callerLabel})`);
      return Response.json({ skipped: true, reason: "notif_vencido deshabilitado" });
    }

    // ─── 4. Get only active spaces ───────────────────────────────────────────
    const espacios = await base44.asServiceRole.entities.EspacioEquipo.filter({ estado: "Activo" });
    const espaciosActivosIds = new Set(espacios.map(e => e.id));

    // ─── 5. Get pedidos vencidos (non-archived, non-closed, active space) ────
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({ archivado: false });
    const vencidos = pedidos.filter(p =>
      p.fecha_requerida &&
      p.fecha_requerida < today &&
      p.estado !== "Cerrado" &&
      p.espacioId &&
      espaciosActivosIds.has(p.espacioId)
    );

    console.log(`[checkVencidos] ${now} - Ejecutado por: ${callerLabel} | Pedidos revisados: ${pedidos.length} | Vencidos: ${vencidos.length}`);

    if (vencidos.length === 0) {
      return Response.json({ ok: true, pedidosRevisados: pedidos.length, notificacionesEnviadas: 0, errores: 0, fechaEjecucion: now });
    }

    // ─── 6. Load responsables for email lookup ───────────────────────────────
    const responsables = await base44.asServiceRole.entities.Responsable.list();
    const respEmailMap = Object.fromEntries(responsables.map(r => [r.nombre, r.email]).filter(([, e]) => e));

    let sent = 0;
    let errores = 0;

    for (const pedido of vencidos) {
      if (!pedido.responsable) continue;
      const responsableEmail = respEmailMap[pedido.responsable];
      if (!responsableEmail) continue;

      // ─── 7. Dedup: one notification per pedido per day per recipient ────────
      const existing = await base44.asServiceRole.entities.NotificacionLog.filter({
        pedido_id: pedido.id,
        tipo: "vencido",
        fecha_envio: today,
        destinatario: responsableEmail,
      });
      if (existing.length > 0) continue;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: responsableEmail,
          subject: `Pedido vencido: ${pedido.titulo}`,
          body: `Hola ${pedido.responsable},\n\nEl siguiente pedido figura como vencido:\n\nPedido: ${pedido.titulo}\nProceso: ${pedido.proceso || "-"}\nPrioridad: ${pedido.prioridad || "-"}\nFecha requerida: ${pedido.fecha_requerida}\n\nPor favor, revisa el pedido y actualiza su estado o fecha requerida si corresponde.\n\nRadar C&T`,
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
        errores++;
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

    console.log(`[checkVencidos] ${now} - Fin | Enviadas: ${sent} | Errores: ${errores}`);
    return Response.json({ ok: true, pedidosRevisados: pedidos.length, notificacionesEnviadas: sent, errores, fechaEjecucion: now });

  } catch (error) {
    console.error(`[checkVencidos] ${now} - Error inesperado:`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    isRunning = false;
  }
});