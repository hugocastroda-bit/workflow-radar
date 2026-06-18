import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, RefreshCw, CheckCircle, XCircle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatusRow({ label, value, ok }) {
  const icon = ok === true
    ? <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
    : ok === false
    ? <XCircle className="h-3.5 w-3.5 text-alert flex-shrink-0" />
    : null;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
      {icon && <div className="mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-muted-foreground">{label}: </span>
        <span className="text-xs text-foreground break-all">{value ?? "—"}</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function Diagnostico() {
  const { user, empresaActiva } = useAuth();
  const isAdmin = user?.role === "admin" || empresaActiva?.rol === "Admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiag = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const result = { timestamp: now, errors: [] };

    try {
      // User info
      result.userId = user?.id || null;
      result.userEmail = user?.email || null;
      result.userFullName = user?.full_name || null;
      result.userRole = user?.role || null;

      // Responsible count
      try {
        const responsables = await base44.entities.Responsable.list();
        result.totalResponsables = responsables.length;
        result.activoResponsables = responsables.filter(r => r.activo !== false).length;
      } catch (e) {
        result.errors.push("Responsables: " + e.message);
      }

      // Solicitors count
      try {
        const solicitantes = await base44.entities.Solicitante.list();
        result.totalSolicitantes = solicitantes.length;
        result.activoSolicitantes = solicitantes.filter(s => s.activo !== false).length;
      } catch (e) {
        result.errors.push("Solicitantes: " + e.message);
      }

      // Processes count
      try {
        const procesos = await base44.entities.Proceso.list();
        result.totalProcesos = procesos.length;
        result.activoProcesos = procesos.filter(p => p.activo !== false).length;
      } catch (e) {
        result.errors.push("Procesos: " + e.message);
      }

      // Priorities count
      try {
        const prioridades = await base44.entities.Prioridad.list();
        result.totalPrioridades = prioridades.length;
        result.activoPrioridades = prioridades.filter(p => p.activo !== false).length;
      } catch (e) {
        result.errors.push("Prioridades: " + e.message);
      }

      // Orders stats
      try {
        const pedidos = await base44.entities.Pedido.list();
        result.totalPedidos = pedidos.length;
        result.pedidosActivos = pedidos.filter(p => !p.archivado).length;
        result.pedidosArchivados = pedidos.filter(p => p.archivado).length;
      } catch (e) {
        result.errors.push("Pedidos: " + e.message);
      }
    } catch (e) {
      result.errors.push("General: " + e.message);
    }

    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) runDiag();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-24 gap-3">
        <ShieldOff className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Solo los administradores pueden acceder al diagnóstico.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Diagnóstico del sistema</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Estado general de la aplicación.</p>
        </div>
        <Button size="sm" variant="outline" onClick={runDiag} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.errors?.length > 0 && (
            <div className="bg-alert/10 border border-alert/30 rounded-lg px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-alert">Errores detectados</p>
              {data.errors.map((e, i) => (
                <p key={i} className="text-xs text-alert">{e}</p>
              ))}
            </div>
          )}

          <Section title="Usuario autenticado">
            <StatusRow label="Email" value={data.userEmail} />
            <StatusRow label="Nombre" value={data.userFullName} />
            <StatusRow label="Rol" value={data.userRole} ok={data.userRole === "admin"} />
          </Section>

          <Section title="Catálogos">
            <StatusRow label="Responsables" value={`${data.activoResponsables}/${data.totalResponsables}`} ok={data.totalResponsables > 0} />
            <StatusRow label="Solicitantes" value={`${data.activoSolicitantes}/${data.totalSolicitantes}`} ok={data.totalSolicitantes > 0} />
            <StatusRow label="Procesos" value={`${data.activoProcesos}/${data.totalProcesos}`} ok={data.totalProcesos > 0} />
            <StatusRow label="Prioridades" value={`${data.activoPrioridades}/${data.totalPrioridades}`} ok={data.totalPrioridades > 0} />
          </Section>

          <Section title="Pedidos">
            <StatusRow label="Total" value={data.totalPedidos} />
            <StatusRow label="Activos" value={data.pedidosActivos} />
            <StatusRow label="Archivados" value={data.pedidosArchivados} />
          </Section>

          <p className="text-xs text-muted-foreground text-right">Actualizado: {data.timestamp}</p>
        </div>
      )}
    </div>
  );
}