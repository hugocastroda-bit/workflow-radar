import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { event, data } = body;
    if (!data || !data.fecha_requerida) {
      return Response.json({ status: 'skipped', reason: 'no fecha_requerida' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Build event payload
    const startDate = data.fecha_requerida; // YYYY-MM-DD
    const eventPayload = {
      summary: `📋 ${data.titulo}`,
      description: [
        data.descripcion ? `Descripción: ${data.descripcion}` : '',
        `Solicitante: ${data.solicitante || '—'}`,
        `Responsable: ${data.responsable || '—'}`,
        `Sede: ${data.sede || '—'}`,
        `Proceso: ${data.proceso || '—'}`,
        `Prioridad: ${data.prioridad || '—'}`,
        `Estado: ${data.estado || '—'}`,
      ].filter(Boolean).join('\n'),
      start: { date: startDate },
      end: { date: startDate },
    };

    let calendarEventId = data.calendar_event_id;
    let response;

    if (calendarEventId && event.type === 'update') {
      // Update existing event
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
        { method: 'PUT', headers: authHeader, body: JSON.stringify(eventPayload) }
      );
      if (response.status === 404) {
        // Event not found, create a new one
        calendarEventId = null;
      }
    }

    if (!calendarEventId) {
      // Create new event
      response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', headers: authHeader, body: JSON.stringify(eventPayload) }
      );
      if (response.ok) {
        const created = await response.json();
        await base44.asServiceRole.entities.Pedido.update(data.id, { calendar_event_id: created.id });
        return Response.json({ status: 'created', eventId: created.id });
      }
    } else {
      if (response && response.ok) {
        return Response.json({ status: 'updated', eventId: calendarEventId });
      }
    }

    const errText = response ? await response.text() : 'unknown';
    return Response.json({ status: 'error', detail: errText }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});