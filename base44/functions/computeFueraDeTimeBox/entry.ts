import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event, data } = body;

    const entityId = event?.entity_id || data?.id;
    if (!entityId) return Response.json({ error: 'Missing entity_id' }, { status: 400 });

    const pedido = data || (await base44.asServiceRole.entities.Pedido.get(entityId));
    if (!pedido) return Response.json({ error: 'Pedido not found' }, { status: 404 });

    const est = parseFloat(pedido.horasEstimadas) || 0;
    const real = parseFloat(pedido.horasReales) || 0;
    const fueraDeTimeBox = real > 0 && est > 0 && real > est;

    if (pedido.fueraDeTimeBox !== fueraDeTimeBox) {
      await base44.asServiceRole.entities.Pedido.update(entityId, { fueraDeTimeBox });
    }

    return Response.json({ success: true, fueraDeTimeBox });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});