import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'No tienes permisos para administrar espacios.' }, { status: 403 });
    }

    const { espacioId } = await req.json();
    if (!espacioId) {
      return Response.json({ error: 'espacioId es requerido.' }, { status: 400 });
    }

    // Validate no associated data exists
    const [pedidos, responsables, procesos, prioridades, membresias] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ espacioId }),
      base44.asServiceRole.entities.Responsable.filter({ espacioId }),
      base44.asServiceRole.entities.Proceso.filter({ espacioId }),
      base44.asServiceRole.entities.Prioridad.filter({ espacioId }),
      base44.asServiceRole.entities.MembresiaEspacio.filter({ espacioId }),
    ]);

    const totalPedidos = pedidos.length;
    const totalResponsables = responsables.length;
    const totalProcesos = procesos.length;
    const totalPrioridades = prioridades.length;
    const totalMembresias = membresias.length;

    if (totalPedidos > 0 || totalResponsables > 0 || totalProcesos > 0 || totalPrioridades > 0 || totalMembresias > 0) {
      const detalles = [];
      if (totalPedidos > 0) detalles.push(`${totalPedidos} pedido(s)`);
      if (totalResponsables > 0) detalles.push(`${totalResponsables} responsable(s)`);
      if (totalProcesos > 0) detalles.push(`${totalProcesos} proceso(s)`);
      if (totalPrioridades > 0) detalles.push(`${totalPrioridades} prioridad(es)`);
      if (totalMembresias > 0) detalles.push(`${totalMembresias} acceso(s) asignado(s)`);

      return Response.json({
        eliminado: false,
        message: `No se puede eliminar este espacio porque tiene información asociada: ${detalles.join(', ')}. Puedes inactivarlo para impedir nuevos accesos.`,
      });
    }

    await base44.asServiceRole.entities.EspacioEquipo.delete(espacioId);

    return Response.json({ eliminado: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});