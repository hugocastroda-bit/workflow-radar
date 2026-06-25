import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

import { ArrowLeft, Pencil, Check, X, ExternalLink, Loader2, AlertTriangle, Trash2, Archive, ArchiveRestore, Lock, LockOpen, History, User, Clock } from "lucide-react";
import ConfirmArchivarModal from "../components/ConfirmArchivarModal";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmConfidencialModal from "../components/ConfirmConfidencialModal";
import ConfidencialBadge from "../components/ConfidencialBadge";
import { canVerConfidencial } from "@/lib/confidencial";
import { sanitizeUrl, truncateText } from "@/lib/security";
import { toast } from "sonner";
import AdaptiveSelect from "@/components/AdaptiveSelect";
import { obtenerResponsablesActivos } from "@/lib/sync-utils";
import { eventBus } from "@/lib/eventBus";
import ComentariosHilo from "@/components/ComentariosHilo";

import { ESTADOS } from "@/lib/pedidoConstants";

function Field({ label, value, highlight, mono }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? "text-alert font-medium" : mono ? "font-mono" : "text-foreground"}`}>
        {value || <span className="text-muted-foreground/50">—</span>}
      </p>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-card border rounded-lg p-6 space-y-5 ${accent || "border-border"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${accent ? "text-emerald-600" : "text-muted-foreground"}`}>{title}</p>
      {children}
    </div>
  );
}

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [draft, setDraft] = useState({});
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfidencial, setShowConfidencial] = useState(false);
  const [savingConf, setSavingConf] = useState(false);
  const { user, empresaActiva } = useAuth();
  const isAdmin = user?.role === "admin" || ["Owner", "Admin"].includes(empresaActiva?.rol);
  const [catalogs, setCatalogs] = useState({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const [solicitantes, responsables, procesos, prioridades] = await Promise.all([
        base44.entities.Solicitante.filter({ activo: true }, "nombre").catch(() => []),
        obtenerResponsablesActivos().catch(() => []),
        base44.entities.Proceso.filter({ activo: true }, "nombre").catch(() => []),
        base44.entities.Prioridad.filter({ activo: true }, "nombre").catch(() => []),
      ]);
      setCatalogs({
        solicitantes: solicitantes.map(s => s.nombre),
        responsables,
        procesos: procesos.map(p => p.nombre),
        prioridades: prioridades.map(p => p.nombre),
      });
    } catch (err) {
      console.error('[DetallePedido] Error loading catalogs:', err);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const items = await base44.entities.HistorialPedido.filter({ pedido_id: id }, "-fecha_cambio");
      setHistorial(items);
    } catch {
      // historial no disponible para este usuario
    } finally {
      setLoadingHistorial(false);
    }
  };

  const load = async () => {
    try {
      const data = await base44.entities.Pedido.get(id);
      setPedido(data);
    } catch {
      toast.error("No se pudo cargar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  // Registra un cambio puntual en el historial de auditoría
  const logCambio = async (campo, valorAnterior, valorNuevo, tipoCambio) => {
    if (String(valorAnterior ?? "") === String(valorNuevo ?? "")) return;
    await base44.entities.HistorialPedido.create({
      empresaId: empresaActiva?.empresaId,
      pedido_id: id,
      campo,
      valor_anterior: String(valorAnterior ?? ""),
      valor_nuevo: String(valorNuevo ?? ""),
      usuario: user?.full_name || user?.email || "Usuario",
      rol_usuario: user?.role || "user",
      fecha_cambio: new Date().toISOString(),
      tipo_cambio: tipoCambio,
    }).catch(() => {}); // No bloquear la UI si falla el log
  };

  const logCambiosSeccion = async (campos, tipoCambio, prevData) => {
    const base = prevData || pedido;
    await Promise.all(campos.map(campo => logCambio(campo, base[campo], draft[campo], tipoCambio)));
  };

  const handleConfidencial = async (motivo) => {
    if (!isAdmin) return;
    setSavingConf(true);
    const marcar = !pedido.confidencial;
    try {
      await base44.entities.Pedido.update(id, {
        confidencial: marcar,
        ...(marcar ? {
          marcado_confidencial_por: user?.full_name || user?.email,
          fecha_marcado_confidencial: new Date().toISOString().split("T")[0],
          motivo_confidencial: motivo || null,
        } : { marcado_confidencial_por: null, fecha_marcado_confidencial: null, motivo_confidencial: null }),
      });
      await logCambio("confidencial", String(!marcar), String(marcar), "confidencial");
      await loadHistorial();
      toast.success(marcar ? "Pedido marcado como confidencial" : "Confidencialidad eliminada");
      await load();
      setShowConfidencial(false);
    } catch {
      toast.error("No se pudo actualizar el pedido.");
    }
    setSavingConf(false);
  };

  useEffect(() => {
    load();
    loadCatalogs();
    loadHistorial();
  }, [id]);

  const startEdit = (section) => {
    setDraft({ ...pedido });
    setEditSection(section);
  };

  const cancelEdit = () => { setEditSection(null); setDraft({}); };

  const saveEdit = async () => {
    if (!user) { toast.error("No estás autenticado."); return; }
    if (!id) { toast.error("Pedido no encontrado."); return; }

    setSaving(true);

    // Capturar estado actual antes de guardar para comparar
    const prevPedido = { ...pedido };

    try {
      let data;

      if (editSection === "seguimiento") {
        data = {
          comentarios_avance: truncateText(draft.comentarios_avance ?? "", 5000),
          proxima_accion: truncateText(draft.proxima_accion ?? "", 500),
        };
        if (isAdmin) {
          data.motivo_bloqueo = truncateText(draft.motivo_bloqueo ?? "", 2000);
        }
      } else {
        // Validar campos obligatorios
        if (!draft.titulo?.trim()) { toast.error("El título es obligatorio."); setSaving(false); return; }
        if (!draft.solicitante?.trim()) { toast.error("El solicitante es obligatorio."); setSaving(false); return; }
        if (!draft.proceso?.trim()) { toast.error("El proceso es obligatorio."); setSaving(false); return; }
        if (!draft.prioridad?.trim()) { toast.error("La prioridad es obligatoria."); setSaving(false); return; }
        if (!draft.estado?.trim()) { toast.error("El estado es obligatorio."); setSaving(false); return; }
        data = { ...draft };
        // Security: truncate long text fields
        if (data.descripcion) data.descripcion = truncateText(data.descripcion, 5000);
        if (data.resultado_final) data.resultado_final = truncateText(data.resultado_final, 5000);
        if (data.comentario_cierre) data.comentario_cierre = truncateText(data.comentario_cierre, 5000);
        if (data.estado === "Cerrado" && !data.fecha_cierre_real) {
          data.fecha_cierre_real = new Date().toISOString().split("T")[0];
        }
      }

      await base44.entities.Pedido.update(id, data);

      // Registrar auditoría por sección
      if (editSection === "seguimiento") {
        await logCambiosSeccion(["comentarios_avance", "proxima_accion", "motivo_bloqueo"], "seguimiento", prevPedido);
      } else if (editSection === "general") {
        await logCambiosSeccion(["titulo", "descripcion", "solicitante", "responsable", "proceso", "prioridad", "fecha_requerida", "estado"], "informacion_general", prevPedido);
      } else if (editSection === "evidencias") {
        // Sanitize link — only allow http/https
        if (data.link_evidencia) {
          data.link_evidencia = sanitizeUrl(data.link_evidencia);
        }
        await logCambiosSeccion(["link_evidencia"], "evidencias", prevPedido);
      } else if (editSection === "cierre") {
        await logCambiosSeccion(["resultado_final", "comentario_cierre", "fecha_cierre_real"], "cierre", prevPedido);
      } else if (editSection === "timeboxing") {
        await logCambiosSeccion(["horasEstimadas", "horasReales", "fechaCompromiso"], "timeboxing", prevPedido);
      }
      await loadHistorial();

      toast.success("Cambios guardados correctamente.");
      await load();
      setEditSection(null);
      setDraft({});
      eventBus.emit('pedidoActualizado', { ...pedido, ...data });
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("No tienes permisos para actualizar este pedido.");
      } else {
        toast.error("No se pudo guardar los cambios. Inténtalo nuevamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  const handleArchive = async (motivo) => {
    if (!isAdmin) return;
    setArchiving(true);
    try {
      await base44.entities.Pedido.update(id, {
        archivado: true,
        fecha_archivado: new Date().toISOString().split("T")[0],
        archivado_por: user?.full_name || user?.email || "Admin",
        ...(motivo ? { motivo_archivo: motivo } : {}),
      });
      await logCambio("archivado", "false", "true", "archivo");
      await logCambio("archivado_por", "", user?.full_name || user?.email || "Admin", "archivo");
      await loadHistorial();
      toast.success("Pedido archivado");
      eventBus.emit('pedidoArchivado', id);
      navigate("/archivados");
    } catch {
      toast.error("No se pudo archivar el pedido.");
    }
    setArchiving(false);
    setShowArchive(false);
  };

  const handleRestore = async () => {
    if (!isAdmin) return;
    setRestoring(true);
    try {
      const pedidoData = await base44.entities.Pedido.get(id);
      await base44.entities.Pedido.update(id, { archivado: false, fecha_archivado: null, archivado_por: null });
      await logCambio("archivado", "true", "false", "archivo");
      await loadHistorial();
      toast.success("Pedido restaurado correctamente");
      await load();
      setShowRestore(false);
      eventBus.emit('pedidoRestaurado', pedidoData);
    } catch {
      toast.error("No se pudo restaurar el pedido.");
    }
    setRestoring(false);
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      await base44.entities.Pedido.delete(id);
      toast.success("Pedido borrado correctamente");
      eventBus.emit('pedidoEliminado', id);
      navigate("/");
    } catch {
      toast.error("No se pudo borrar el pedido. Inténtalo nuevamente.");
    }
    setDeleting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!pedido) return <div className="p-8 text-sm text-muted-foreground">Pedido no encontrado</div>;

  if (!canVerConfidencial(pedido, user, empresaActiva?.rol)) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">No tienes permisos para acceder a este pedido.</p>
        <p className="text-xs text-muted-foreground">Este pedido es confidencial y solo está disponible para usuarios autorizados.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary underline mt-2">Volver</button>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isArchived = !!pedido.archivado;
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";
  const isClosed = pedido.estado === "Cerrado";

  const EditBar = ({ section }) => {
    if (editSection === section) return (
      <div className="flex gap-2">
        <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5 h-7 text-xs">
          <Check className="h-3 w-3" /> {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs gap-1">
          <X className="h-3 w-3" /> Cancelar
        </Button>
      </div>
    );
    return (
      <Button size="sm" variant="ghost" onClick={() => startEdit(section)} className="h-7 text-xs text-muted-foreground gap-1 -mr-1">
        <Pencil className="h-3 w-3" /> Editar
      </Button>
    );
  };

  const EditBarSeguimiento = () => {
    if (editSection === "seguimiento") return (
      <div className="flex gap-2">
        <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5 h-7 text-xs">
          <Check className="h-3 w-3" /> {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs gap-1">
          <X className="h-3 w-3" /> Cancelar
        </Button>
      </div>
    );
    return (
      <Button size="sm" variant="ghost" onClick={() => startEdit("seguimiento")} className="h-7 text-xs text-muted-foreground gap-1 -mr-1">
        <Pencil className="h-3 w-3" /> Editar
      </Button>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <button onClick={() => navigate(-1)} className="mt-0.5 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h1 className="text-lg font-semibold text-foreground">{pedido.titulo}</h1>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-alert bg-alert/10 border border-alert/20 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" /> Vencido
                </span>
              )}
              {pedido.confidencial && <ConfidencialBadge />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={pedido.estado} />
              <PriorityBadge priority={pedido.prioridad} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground shrink-0">
            Actualizado {pedido.updated_date?.split("T")[0] || "—"}
          </p>
          {isAdmin && (
            <div className="flex flex-col items-end gap-1.5">
              {isArchived ? (
                <button onClick={() => setShowRestore(true)}
                  className="flex items-center gap-1 text-xs text-success hover:opacity-80 transition-colors">
                  <ArchiveRestore className="h-3 w-3" /> Restaurar pedido
                </button>
              ) : (
                <button onClick={() => setShowArchive(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Archive className="h-3 w-3" /> Archivar pedido
                </button>
              )}
              <button onClick={() => setShowConfidencial(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                {pedido.confidencial ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {pedido.confidencial ? "Quitar confidencialidad" : "Marcar confidencial"}
              </button>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-alert transition-colors">
                <Trash2 className="h-3 w-3" /> Borrar pedido
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerta archivado */}
      {isArchived && (
        <div className="flex items-center gap-2.5 bg-secondary border border-border rounded-lg px-4 py-3">
          <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Pedido archivado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Archivado el {pedido.fecha_archivado || "—"} por {pedido.archivado_por || "—"}
              {pedido.motivo_archivo ? ` · ${pedido.motivo_archivo}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Alerta bloqueo */}
      {isBlocked && pedido.motivo_bloqueo && (
        <div className="flex items-start gap-2.5 bg-warning/10 border border-warning/30 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-warning">Pedido bloqueado</p>
            <p className="text-sm text-foreground/80 mt-0.5">{pedido.motivo_bloqueo}</p>
          </div>
        </div>
      )}

      {/* 1. Información general */}
      <Section title="Información general">
        <div className="flex items-center justify-between">
          <div /> {isAdmin && <EditBar section="general" />}
        </div>

        {editSection === "general" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Título *</Label>
              <Input value={draft.titulo || ""} onChange={e => set("titulo", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Textarea value={draft.descripcion || ""} onChange={e => set("descripcion", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdaptiveSelect
                label="Solicitante *"
                value={draft.solicitante || ""}
                onChange={v => set("solicitante", v)}
                options={catalogs.solicitantes || []}
                placeholder="Seleccionar"
                required
              />
              <AdaptiveSelect
                label="Responsable"
                value={draft.responsable || ""}
                onChange={v => set("responsable", v)}
                options={[
                  ...(catalogs.responsables || []).map(r => `${r.nombre} — ${r.email || ''}`),
                ]}
                placeholder="Sin responsable"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdaptiveSelect
                label="Proceso *"
                value={draft.proceso || ""}
                onChange={v => set("proceso", v)}
                options={catalogs.procesos || []}
                placeholder="Seleccionar"
                required
              />
              <AdaptiveSelect
                label="Prioridad *"
                value={draft.prioridad || ""}
                onChange={v => set("prioridad", v)}
                options={catalogs.prioridades || []}
                placeholder="Seleccionar"
                required
              />
            </div>
            <div>
              <AdaptiveSelect
                label="Estado *"
                value={draft.estado || ""}
                onChange={v => set("estado", v)}
                options={ESTADOS}
                placeholder="Seleccionar"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Fecha requerida</Label>
                <Input type="date" value={draft.fecha_requerida || ""} onChange={e => set("fecha_requerida", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <Field label="Solicitante" value={pedido.solicitante} />
              <Field label="Responsable" value={pedido.responsable} />
              <Field label="Proceso" value={pedido.proceso} />
              <Field label="Fecha requerida" value={pedido.fecha_requerida} highlight={isOverdue} />
              <Field label="Fecha de creación" value={pedido.created_date?.split("T")[0]} />
            </div>
            {pedido.descripcion && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{pedido.descripcion}</p>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 1.5 Time Boxing */}
      <Section title="Time Boxing">
        <div className="flex items-center justify-between">
          <div /> {isAdmin && <EditBar section="timeboxing" />}
        </div>

        {editSection === "timeboxing" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Minutos estimados</Label>
              <Input type="number" step="5" min="0" value={draft.horasEstimadas ?? ""} onChange={e => set("horasEstimadas", e.target.value ? parseFloat(e.target.value) : null)} className="mt-1" placeholder="Ej: 120" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Minutos reales</Label>
              <Input type="number" step="5" min="0" value={draft.horasReales ?? ""} onChange={e => set("horasReales", e.target.value ? parseFloat(e.target.value) : null)} className="mt-1" placeholder="Ej: 150" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha compromiso</Label>
              <Input type="date" value={draft.fechaCompromiso || ""} onChange={e => set("fechaCompromiso", e.target.value)} className="mt-1" />
            </div>
          </div>
        ) : (
          <>
            {pedido.horasEstimadas != null ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Minutos estimados</p>
                    <p className="text-sm text-foreground">{pedido.horasEstimadas} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Minutos reales</p>
                    <p className="text-sm text-foreground">{pedido.horasReales != null ? `${pedido.horasReales} min` : <span className="text-muted-foreground/50">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Fecha compromiso</p>
                    <p className="text-sm text-foreground">{pedido.fechaCompromiso || <span className="text-muted-foreground/50">—</span>}</p>
                  </div>
                </div>
                {(() => {
                  const est = pedido.horasEstimadas || 0;
                  const real = pedido.horasReales;
                  const pct = real != null && est > 0 ? real / est : null;
                  const fueraDeTimeBox = real != null && est > 0 && real > est;
                  let statusColor = "bg-emerald-500";
                  let statusLabel = "Dentro del tiempo";
                  if (pct !== null) {
                    if (pct >= 1) { statusColor = "bg-red-500"; statusLabel = `Fuera del Time Box (${Math.round((pct - 1) * 100)}% excedido)`; }
                    else if (pct >= 0.8) { statusColor = "bg-amber-500"; statusLabel = `Próximo al límite (${Math.round(pct * 100)}%)`; }
                    else { statusColor = "bg-emerald-500"; statusLabel = `Dentro del tiempo (${Math.round(pct * 100)}%)`; }
                  }
                  return (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                      <p className="text-xs text-muted-foreground">
                        {statusLabel}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Sin estimación
              </p>
            )}
          </>
        )}
      </Section>

      {/* 2. Seguimiento */}
      <Section title="Seguimiento">
        <div className="flex items-center justify-between">
          <div /> <EditBarSeguimiento />
        </div>

        {editSection === "seguimiento" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Comentarios de avance</Label>
              <Textarea value={draft.comentarios_avance || ""} onChange={e => set("comentarios_avance", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Próxima acción</Label>
              <Input value={draft.proxima_accion || ""} onChange={e => set("proxima_accion", e.target.value)} className="mt-1" />
            </div>
            {isAdmin && pedido.estado === "Bloqueado" && (
              <div>
                <Label className="text-xs text-muted-foreground">Motivo de bloqueo</Label>
                <Textarea value={draft.motivo_bloqueo || ""} onChange={e => set("motivo_bloqueo", e.target.value)} className="mt-1" rows={2} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Comentarios de avance" value={pedido.comentarios_avance} />
            <Field label="Próxima acción" value={pedido.proxima_accion} />
            {isBlocked && (
              <Field label="Motivo de bloqueo" value={pedido.motivo_bloqueo} />
            )}
            <p className="text-xs text-muted-foreground">
              Última actualización: {pedido.updated_date?.split("T")[0] || "—"}
            </p>
          </div>
        )}

        {/* Hilo de comentarios */}
        <div className="pt-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comentarios en hilo</p>
          <ComentariosHilo pedidoId={id} />
        </div>
      </Section>

      {/* 3. Auditoría de cambios — siempre visible */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Auditoría de cambios</p>
        </div>
        {loadingHistorial ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : historial.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-2">Sin cambios registrados aún.</p>
        ) : (
          <div className="space-y-0">
            {historial.map((item, i) => {
              const fecha = item.fecha_cambio
                ? new Date(item.fecha_cambio).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';
              return (
                <div key={item.id} className={`flex gap-3 py-3 ${i < historial.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{item.usuario}</p>
                      <p className="text-xs text-muted-foreground shrink-0">{fecha}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/80">{item.campo}</span>
                      {item.valor_anterior && item.valor_anterior !== item.valor_nuevo ? (
                        <> · <span className="line-through opacity-50">{item.valor_anterior}</span> → <span>{item.valor_nuevo}</span></>
                      ) : (
                        <> → {item.valor_nuevo}</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Evidencias */}
      <Section title="Evidencias">
        <div className="flex items-center justify-between">
          <div /> {isAdmin && <EditBar section="evidencias" />}
        </div>

        {editSection === "evidencias" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Link relacionado</Label>
              <Input value={draft.link_evidencia || ""} onChange={e => set("link_evidencia", e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pedido.link_evidencia ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Link relacionado</p>
                {(() => {
                  const safeUrl = sanitizeUrl(pedido.link_evidencia);
                  return safeUrl ? (
                    <a href={safeUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      {safeUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Link no válido — solo se permiten URLs https://</p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">Sin evidencias registradas</p>
            )}
          </div>
        )}
      </Section>

      {/* 5. Cierre (solo si aplica) */}
      {(isClosed || editSection === "cierre") && (
        <Section title="Cierre" accent="border-emerald-200">
          <div className="flex items-center justify-between">
            <div /> {isAdmin && <EditBar section="cierre" />}
          </div>

          {editSection === "cierre" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Resultado final</Label>
                <Textarea value={draft.resultado_final || ""} onChange={e => set("resultado_final", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Comentario de cierre</Label>
                <Textarea value={draft.comentario_cierre || ""} onChange={e => set("comentario_cierre", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha real de cierre</Label>
                <Input type="date" value={draft.fecha_cierre_real || ""} onChange={e => set("fecha_cierre_real", e.target.value)} className="mt-1" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Resultado final" value={pedido.resultado_final} />
              <Field label="Comentario de cierre" value={pedido.comentario_cierre} />
              <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />
            </div>
          )}
        </Section>
      )}

      {/* Registrar cierre manualmente si no está cerrado */}
      {!isClosed && editSection !== "cierre" && isAdmin && (
        <div className="text-center pt-1">
          <button onClick={() => startEdit("cierre")} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            Registrar cierre manualmente
          </button>
        </div>
      )}

      <ConfirmArchivarModal
        open={showArchive}
        onClose={() => setShowArchive(false)}
        onConfirm={handleArchive}
        archiving={archiving}
      />

      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Restaurar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">¿Deseas restaurar este pedido? Volverá a aparecer en la Bandeja y en el Kanban.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowRestore(false)} disabled={restoring}>Cancelar</Button>
            <Button size="sm" onClick={handleRestore} disabled={restoring}
              className="bg-success hover:bg-success/90 text-white">
              {restoring ? "Restaurando…" : "Sí, restaurar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      <ConfirmConfidencialModal
        open={showConfidencial}
        onClose={() => setShowConfidencial(false)}
        onConfirm={handleConfidencial}
        marcar={!pedido.confidencial}
        saving={savingConf}
      />
    </div>
  );
}