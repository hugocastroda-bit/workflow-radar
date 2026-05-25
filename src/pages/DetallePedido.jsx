import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { ArrowLeft, Pencil, Check, X, ExternalLink, Loader2, AlertTriangle, Trash2, Archive, ArchiveRestore, Lock, LockOpen, History, User } from "lucide-react";
import ConfirmArchivarModal from "../components/ConfirmArchivarModal";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmConfidencialModal from "../components/ConfirmConfidencialModal";
import ConfidencialBadge from "../components/ConfidencialBadge";
import { canVerConfidencial } from "@/lib/confidencial";
import { toast } from "sonner";
import SearchableSelect from "@/components/SearchableSelect";
import { obtenerResponsablesActivos } from "@/lib/sync-utils";
import { eventBus } from "@/lib/eventBus";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

function Field({ label, value, highlight, mono }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? "text-red-600 font-medium" : mono ? "font-mono" : "text-foreground"}`}>
        {value || <span className="text-muted-foreground/50">—</span>}
      </p>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-white border rounded-lg p-6 space-y-5 ${accent || "border-border"}`}>
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
    console.log("[saveEdit] Sección:", editSection, "| Rol:", user?.role, "| ID:", id);

    try {
      let data;

      if (editSection === "seguimiento") {
        // Update parcial: solo campos de seguimiento
        data = {
          comentarios_avance: draft.comentarios_avance ?? "",
          proxima_accion: draft.proxima_accion ?? "",
        };
        // Admin también puede editar motivo de bloqueo
        if (isAdmin) {
          data.motivo_bloqueo = draft.motivo_bloqueo ?? "";
        }
        console.log("[saveEdit] Payload seguimiento:", JSON.stringify(data));
      } else {
        // Admin: update completo
        if (!isAdmin) { toast.error("No tienes permisos para editar esta sección."); setSaving(false); return; }
        // Validar campos obligatorios
        if (!draft.titulo?.trim()) { toast.error("El título es obligatorio."); setSaving(false); return; }
        if (!draft.solicitante?.trim()) { toast.error("El solicitante es obligatorio."); setSaving(false); return; }
        if (!draft.proceso?.trim()) { toast.error("El proceso es obligatorio."); setSaving(false); return; }
        if (!draft.prioridad?.trim()) { toast.error("La prioridad es obligatoria."); setSaving(false); return; }
        if (!draft.estado?.trim()) { toast.error("El estado es obligatorio."); setSaving(false); return; }
        data = { ...draft };
        if (data.estado === "Cerrado" && !data.fecha_cierre_real) {
          data.fecha_cierre_real = new Date().toISOString().split("T")[0];
        }
        console.log("[saveEdit] Payload admin:", JSON.stringify(data));
      }

      await base44.entities.Pedido.update(id, data);
      console.log("[saveEdit] Update exitoso");
      toast.success("Cambios guardados correctamente.");
      await load();
      setEditSection(null);
      setDraft({});
      // Emitir evento para que otras vistas se actualicen
      eventBus.emit('pedidoActualizado', pedido);
    } catch (err) {
      console.error("[saveEdit] Error:", err.message, err.response?.data);
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

  // Access control for confidential pedidos
  if (!canVerConfidencial(pedido, user)) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Lock className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No tienes permisos para acceder a este pedido.</p>
        <p className="text-xs text-slate-400">Este pedido es confidencial y solo está disponible para usuarios autorizados.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-slate-500 underline mt-2">Volver</button>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isArchived = !!pedido.archivado;
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";
  const isClosed = pedido.estado === "Cerrado";

  // EditBar para Admin (todas las secciones)
  const EditBar = ({ section }) => {
    if (!isAdmin) return null;
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

  // EditBar para sección Seguimiento (Admin + User)
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
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5">

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
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" /> Vencido
                </span>
              )}
              {pedido.confidencial && <ConfidencialBadge />}
            </div>
            <div className="flex items-center gap-1.5">
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
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                  <ArchiveRestore className="h-3 w-3" /> Restaurar pedido
                </button>
              ) : (
                <button onClick={() => setShowArchive(true)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  <Archive className="h-3 w-3" /> Archivar pedido
                </button>
              )}
              <button onClick={() => setShowConfidencial(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors">
                {pedido.confidencial ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {pedido.confidencial ? "Quitar confidencialidad" : "Marcar confidencial"}
              </button>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-3 w-3" /> Borrar pedido
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerta archivado */}
      {isArchived && (
        <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-300 rounded-lg px-4 py-3">
          <Archive className="h-4 w-4 text-slate-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700">Pedido archivado</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Archivado el {pedido.fecha_archivado || "—"} por {pedido.archivado_por || "—"}
              {pedido.motivo_archivo ? ` · ${pedido.motivo_archivo}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Alerta bloqueo */}
      {isBlocked && pedido.motivo_bloqueo && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Pedido bloqueado</p>
            <p className="text-sm text-amber-800 mt-0.5">{pedido.motivo_bloqueo}</p>
          </div>
        </div>
      )}

      {/* 1. Información general */}
      <Section title="Información general">
        <div className="flex items-center justify-between">
          <div /> <EditBar section="general" />
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
              <SearchableSelect
                label="Solicitante *"
                value={draft.solicitante || ""}
                onChange={v => set("solicitante", v)}
                options={catalogs.solicitantes || []}
                placeholder="Seleccionar"
                required
              />
              <SearchableSelect
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
              <SearchableSelect
                label="Proceso *"
                value={draft.proceso || ""}
                onChange={v => set("proceso", v)}
                options={catalogs.procesos || []}
                placeholder="Seleccionar"
                required
              />
              <SearchableSelect
                label="Prioridad *"
                value={draft.prioridad || ""}
                onChange={v => set("prioridad", v)}
                options={catalogs.prioridades || []}
                placeholder="Seleccionar"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                label="Estado *"
                value={draft.estado || ""}
                onChange={v => set("estado", v)}
                options={ESTADOS}
                placeholder="Seleccionar"
                required
              />
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
      </Section>

      {/* Historial de cambios */}
      {(historial.length > 0 || loadingHistorial) && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Historial de cambios</p>
          </div>
          {loadingHistorial ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
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
                        {item.valor_anterior && item.valor_anterior !== item.valor_nuevo && (
                          <> · <span className="line-through opacity-50">{item.valor_anterior}</span> → </>
                        )}
                        {item.valor_anterior && item.valor_anterior !== item.valor_nuevo && (
                          <span>{item.valor_nuevo}</span>
                        )}
                        {(!item.valor_anterior || item.valor_anterior === item.valor_nuevo) && (
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
      )}

      {/* 3. Evidencias */}
      <Section title="Evidencias">
        <div className="flex items-center justify-between">
          <div /> <EditBar section="evidencias" />
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
                <a href={pedido.link_evidencia} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline break-all">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {pedido.link_evidencia}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">Sin evidencias registradas</p>
            )}
          </div>
        )}
      </Section>

      {/* 4. Cierre (solo si aplica) */}
      {(isClosed || editSection === "cierre") && (
        <Section title="Cierre" accent="border-emerald-200">
          <div className="flex items-center justify-between">
            <div /> <EditBar section="cierre" />
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

      {/* Editar cierre si no está cerrado */}
      {!isClosed && editSection !== "cierre" && (
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

      {/* Restore confirmation */}
      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Restaurar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">¿Deseas restaurar este pedido? Volverá a aparecer en la Bandeja y en el Kanban.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowRestore(false)} disabled={restoring}>Cancelar</Button>
            <Button size="sm" onClick={handleRestore} disabled={restoring}
              className="bg-emerald-700 hover:bg-emerald-600 text-white">
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