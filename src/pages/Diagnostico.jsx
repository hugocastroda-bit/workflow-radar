import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminGlobal, useEspacio } from "@/lib/EspacioContext";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatusRow({ label, value, ok, warn }) {
  const icon = ok === true
    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
    : ok === false
    ? <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
    : warn
    ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
    : null;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      {icon && <div className="mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-slate-500">{label}: </span>
        <span className="text-xs text-slate-800 break-all">{value ?? "—"}</span>
      </div>
    </div>
  );
}

export default function Diagnostico() {
  const { user } = useAuth();
  const { espacioActivo, membresiaActiva } = useEspacio();
  const isAdmin = isAdminGlobal(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiag = async () => {
    setLoading(true);
    const emailAuth = (user?.email || "").toLowerCase().trim();
    const now = new Date().toISOString();
    const result = { timestamp: now, emailAuth, errores: [] };

    try {
      // Usuario
      result.userId = user?.id || null;
      result.userFullName = user?.full_name || null;
      result.userRole = user?.role || null;
      result.emailNormalizado = emailAuth;

      // Responsable vinculado
      try {
        const responsables = await base44.entities.Responsable.list();
        const resp = responsables.find(r => (r.email || "").toLowerCase().trim() === emailAuth);
        result.responsableEncontrado = !!resp;
        result.responsableId = resp?.id || null;
        result.responsableNombre = resp?.nombre || null;
        result.responsableEmail = resp?.email || null;
        result.responsableActivo = resp ? resp.activo !== false : null;
        // Check duplicates
        const dups = responsables.filter(r => (r.email || "").toLowerCase().trim() === emailAuth);
        result.responsablesDuplicados = dups.length > 1 ? dups.map(r => r.id) : [];
      } catch (e) {
        result.errores.push("Responsable: " + e.message);
        result.responsableEncontrado = false;
      }

      // Membresías
      try {
        const membs = await base44.entities.MembresiaEspacio.filter({ correoUsuario: emailAuth });
        result.totalMembresias = membs.length;
        result.membresiaActivas = membs.filter(m => m.estado === "Activo").length;
        result.membresiaInactivas = membs.filter(m => m.estado !== "Activo").length;
        result.membresiasDetalle = membs.map(m => ({
          espacioId: m.espacioId,
          rol: m.rolEnEspacio,
          estado: m.estado,
          validadoConClave: m.validadoConClave,
        }));
      } catch (e) {
        result.errores.push("Membresías: " + e.message);
        result.totalMembresias = 0;
      }

      // Espacio activo (sesión actual)
      result.espacioActivoId = espacioActivo?.id || null;
      result.espacioActivoNombre = espacioActivo?.nombreEspacio || null;
      result.espacioActivoEstado = espacioActivo?.estado || null;
      result.rolEnEspacioActivo = membresiaActiva?.rolEnEspacio || null;

      // Pedidos del espacio activo
      if (espacioActivo?.id) {
        try {
          const pedidos = await base44.entities.Pedido.filter({ archivado: false, espacioId: espacioActivo.id });
          result.pedidosCargados = pedidos.length;
          result.pedidosSinEspacioId = pedidos.filter(p => !p.espacioId).length;
        } catch (e) {
          result.errores.push("Pedidos: " + e.message);
          result.pedidosCargados = 0;
        }

        // Catálogos
        try {
          const [sols, resps, procs, prios] = await Promise.all([
            base44.entities.Solicitante.filter({ activo: true, espacioId: espacioActivo.id }),
            base44.entities.Responsable.filter({ activo: true, espacioId: espacioActivo.id }),
            base44.entities.Proceso.filter({ activo: true, espacioId: espacioActivo.id }),
            base44.entities.Prioridad.filter({ activo: true, espacioId: espacioActivo.id }),
          ]);
          result.catalogoSolicitantes = sols.length;
          result.catalogoResponsables = resps.length;
          result.catalogoProcesos = procs.length;
          result.catalogoPrioridades = prios.length;
        } catch (e) {
          result.errores.push("Catálogos: " + e.message);
        }
      }
    } catch (e) {
      result.errores.push("Error general: " + e.message);
    }

    setData(result);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) runDiag(); }, []);

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-24 gap-3">
        <ShieldOff className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Solo los administradores pueden acceder al diagnóstico.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Panel de diagnóstico</h1>
          <p className="text-xs text-slate-400 mt-0.5">Solo visible para administradores. Retira esta sección antes de producción final.</p>
        </div>
        <Button size="sm" variant="outline" onClick={runDiag} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.errores?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-red-700">Errores detectados</p>
              {data.errores.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}

          <Section title="Usuario autenticado">
            <StatusRow label="Email" value={data.emailAuth} />
            <StatusRow label="Email normalizado" value={data.emailNormalizado} />
            <StatusRow label="Nombre" value={data.userFullName} />
            <StatusRow label="Rol global" value={data.userRole} ok={data.userRole === "admin"} />
          </Section>

          <Section title="Responsable vinculado">
            <StatusRow label="Encontrado" value={data.responsableEncontrado ? "Sí" : "No"} ok={data.responsableEncontrado} />
            <StatusRow label="Nombre" value={data.responsableNombre} />
            <StatusRow label="Email en registro" value={data.responsableEmail} />
            <StatusRow label="ID" value={data.responsableId} />
            <StatusRow label="Activo" value={data.responsableActivo === null ? "—" : data.responsableActivo ? "Sí" : "No"} ok={data.responsableActivo} />
            {data.responsablesDuplicados?.length > 1 && (
              <StatusRow label="⚠ Duplicados encontrados" value={data.responsablesDuplicados.join(", ")} warn />
            )}
          </Section>

          <Section title="Accesos a espacios">
            <StatusRow label="Total membresías" value={data.totalMembresias} ok={data.totalMembresias > 0} />
            <StatusRow label="Activas" value={data.membresiaActivas} ok={data.membresiaActivas > 0} />
            <StatusRow label="Inactivas" value={data.membresiaInactivas} warn={data.membresiaInactivas > 0} />
            {data.membresiasDetalle?.map((m, i) => (
              <div key={i} className="ml-4 border-l-2 border-slate-200 pl-3 py-1 space-y-0.5">
                <p className="text-xs text-slate-600"><span className="font-medium">EspacioId:</span> {m.espacioId}</p>
                <p className="text-xs text-slate-600"><span className="font-medium">Rol:</span> {m.rol}</p>
                <p className="text-xs text-slate-600"><span className="font-medium">Estado:</span> <span className={m.estado === "Activo" ? "text-emerald-600" : "text-red-500"}>{m.estado}</span></p>
              </div>
            ))}
          </Section>

          <Section title="Espacio activo (sesión)">
            <StatusRow label="ID" value={data.espacioActivoId} ok={!!data.espacioActivoId} />
            <StatusRow label="Nombre" value={data.espacioActivoNombre} />
            <StatusRow label="Estado" value={data.espacioActivoEstado} ok={data.espacioActivoEstado === "Activo"} />
            <StatusRow label="Rol en espacio" value={data.rolEnEspacioActivo} />
          </Section>

          {data.espacioActivoId && (
            <>
              <Section title="Pedidos (espacio activo)">
                <StatusRow label="Pedidos cargados" value={data.pedidosCargados} />
                <StatusRow label="Sin espacioId (huérfanos)" value={data.pedidosSinEspacioId} ok={data.pedidosSinEspacioId === 0} warn={data.pedidosSinEspacioId > 0} />
              </Section>

              <Section title="Catálogos (espacio activo, activos)">
                <StatusRow label="Solicitantes" value={data.catalogoSolicitantes} ok={data.catalogoSolicitantes > 0} warn={data.catalogoSolicitantes === 0} />
                <StatusRow label="Responsables" value={data.catalogoResponsables} ok={data.catalogoResponsables > 0} warn={data.catalogoResponsables === 0} />
                <StatusRow label="Procesos" value={data.catalogoProcesos} ok={data.catalogoProcesos > 0} warn={data.catalogoProcesos === 0} />
                <StatusRow label="Prioridades" value={data.catalogoPrioridades} ok={data.catalogoPrioridades > 0} warn={data.catalogoPrioridades === 0} />
              </Section>
            </>
          )}

          <p className="text-xs text-slate-400 text-right">Diagnóstico ejecutado: {data.timestamp}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}