import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { data, old_data } = body;

    // Solo notificar si el estado cambió
    if (!data || !old_data || data.estado === old_data.estado) {
      return Response.json({ status: 'skipped', reason: 'estado no cambió' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Buscar el email del usuario creador del pedido
    const users = await base44.asServiceRole.entities.User.list();
    const creador = users.find(u => u.email === data.created_by);
    const emailDestino = creador?.email;

    if (!emailDestino) {
      return Response.json({ status: 'skipped', reason: 'no se encontró email del creador' });
    }

    const subject = `[Radar C&T] Pedido actualizado: ${data.titulo}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">Radar C&T — Actualización de Pedido</h2>
        </div>
        <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 15px;">El estado del siguiente pedido ha sido actualizado:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; font-weight: bold; color: #6b7280; width: 40%;">Pedido</td>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; color: #111827;">${data.titulo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e2e8f0; font-weight: bold; color: #6b7280;">Estado anterior</td>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e2e8f0; color: #6b7280;">${old_data.estado}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; font-weight: bold; color: #6b7280;">Nuevo estado</td>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; color: #111827; font-weight: bold;">${data.estado}</td>
            </tr>
            ${data.responsable ? `<tr>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e2e8f0; font-weight: bold; color: #6b7280;">Responsable</td>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e2e8f0; color: #374151;">${data.responsable}</td>
            </tr>` : ''}
            ${data.proxima_accion ? `<tr>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; font-weight: bold; color: #6b7280;">Próxima acción</td>
              <td style="padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; color: #374151;">${data.proxima_accion}</td>
            </tr>` : ''}
          </table>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Este mensaje fue enviado automáticamente por Radar C&T.</p>
        </div>
      </div>
    `;

    // Build RFC 2822 message
    const mime = [
      `From: Radar C&T <me>`,
      `To: ${emailDestino}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      bodyHtml,
    ].join('\r\n');

    const encoded = btoa(unescape(encodeURIComponent(mime)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ status: 'error', detail: err }, { status: 500 });
    }

    return Response.json({ status: 'sent', to: emailDestino, estado: data.estado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});