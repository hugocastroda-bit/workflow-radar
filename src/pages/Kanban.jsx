import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "../components/KanbanColumn";
import { Loader2, X } from "lucide-react";
import ConfirmArchivarModal from "../components/ConfirmArchivarModal";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmConfidencialModal from "../components/ConfirmConfidencialModal";
import { filtrarConfidenciales } from "@/lib/confidencial";
import { useEspacio } from "@/lib/EspacioContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

export default function Kanban() {
  const [pedidos, setPedidos]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState({ responsable: "", prioridad: "", proceso: "", solicitante: "", estado: "" });
  const [blockModal, setBlockModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confidencialTarget, setConfidencialTarget] = useState(null);
  const [savingConf, setSavingConf] = useState(false);
  const { user } = useAuth();
  const { espacioActivo } = useEspacio();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!espacioActivo?.id) { setLoading(false); return; }
    base44.entities.Pedido.filter({ archivado: false, espacioId: espacioActivo.id }, "-created_date")
      .then(d => setPedidos(filtrarConfidenciales(d, user)))
      .catch(() => toast.error("No se pudieron cargar los pedidos."))
      .finally(() => setLoading(false));
  }, [espacioActivo?.id]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ responsable: "", prioridad: "", proceso: "", solicitante: "", estado: "" });
  const hasFilters = Object.values(filters).some(Boolean);

  const responsables = [...new Set(pedidos.map(p => p.responsable).filter(Boolean))];
  const procesos     = [...new Set(pedidos.map(p => p.proceso).filter(Boolean))];

  const filtered = pedidos.filter(p => {
    if (filters.responsable && (filters.responsable === "__sin__" ? !!p.responsable : p.responsable !== filters.responsable)) return false;
    if (filters.prioridad   && p.prioridad   !== filters.prioridad)   return false;
    if (filters.proceso     && p.proceso     !== filters.proceso)     return false;
    if (filters.solicitante && p.solicitante !== filters.solicitante) return false;
    if (filters.estado      && p.estado      !== filters.estado)      return false;
    return true;
  });

  const handleDragEnd = async (result) => {
    if (!isAdmin || !result.destination) return;
    const { draggableId, destination } = result;
    const newEstado = destination.droppableId;
    const pedido = pedidos.find(p => p.id === draggableId);
    if (!pedido || pedido.estado === newEstado) return;

    const prevEstado = pedido.estado;
    // Optimistic update
    setPedidos(prev => prev.map(p => p.id === draggableId ? { ...p, estado: newEstado } : p));

    if (newEstado === "Bloqueado") {
      setBlockModal({ id: draggableId, motivo: pedido.motivo_bloqueo || "" });
    }

    const updateData = { estado: newEstado };
    if (newEstado === "Cerrado") {
      updateData.fecha_cierre_real = new Date().toISOString().split("T")[0];
    }

    try {
      await base44.entities.Pedido.update(draggableId, updateData);
      // Trigger notifications in background (non-blocking)
      base44.functions.invoke("sendNotificacion", { tipo: newEstado === "Bloqueado" ? "bloqueado" : newEstado === "Cerrado" ? "cerrado" : null, pedidoId: draggableId }).catch(() => {});
    } catch (err) {
      console.error("[Kanban] Error moviendo pedido:", err);
      // Rollback optimistic update on failure
      setPedidos(prev => prev.map(p => p.id === draggableId ? { ...p, estado: prevEstado } : p));
      // Also clear block modal if it was opened optimistically
      if (newEstado === "Bloqueado") setBlockModal(null);
      toast.error("No se pudo mover el pedido. Inténtalo nuevamente.");
    }
  };

  const saveBlockMotivo = async () => {
    if (!blockModal) return;
    try {
      await base44.entities.Pedido.update(blockModal.id, { motivo_bloqueo: blockModal.motivo });
      setPedidos(prev => prev.map(p => p.id === blockModal.id ? { ...p, motivo_bloqueo: blockModal.motivo } : p));
      setBlockModal(null);
      toast.success("Motivo de bloqueo guardado");
    } catch (err) {
      console.error("[Kanban] Error guardando motivo:", err);
      toast.error("No se pudo guardar el motivo de bloqueo.");
    }
  };

  const handleArchive = async (motivo) => {
    if (!isAdmin || !archiveTarget) return;
    setArchiving(true);
    try {
      await base44.entities.Pedido.update(archiveTarget.id, {
        archivado: true,
        fecha_archivado: new Date().toISOString().split("T")[0],
        archivado_por: user?.full_name || user?.email || "Admin",
        ...(motivo ? { motivo_archivo: motivo } : {}),
      });
      setPedidos(prev => prev.filter(p => p.id !== archiveTarget.id));
      setArchiveTarget(null);
      toast.success("Pedido archivado correctamente");
    } catch (err) {
      console.error("[Kanban] Error archivando:", err);
      toast.error("No se pudo archivar el pedido.");
    }
    setArchiving(false);
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      await base44.entities.Pedido.delete(deleteTarget.id);
      setPedidos(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Pedido borrado correctamente");
    } catch (err) {
      console.error("[Kanban] Error borrando:", err);
      toast.error("No se pudo borrar el pedido. Inténtalo nuevamente.");
    }
    setDeleting(false);
  };

  const handleConfidencial = async (motivo) => {
    if (!isAdmin || !confidencialTarget) return;
    setSavingConf(true);
    const marcar = confidencialTarget.marcar;
    try {
      await base44.entities.Pedido.update(confidencialTarget.id, {
        confidencial: marcar,
        ...(marcar ? {
          marcado_confidencial_por: user?.full_name || user?.email,
          fecha_marcado_confidencial: new Date().toISOString().split("T")[0],
          motivo_confidencial: motivo || null,
        } : { marcado_confidencial_por: null, fecha_marcado_confidencial: null, motivo_confidencial: null }),
      });
      setPedidos(prev => prev.map(p => p.id === confidencialTarget.id ? { ...p, confidencial: marcar } : p));
      toast.success(marcar ? "Pedido marcado como confidencial" : "Confidencialidad eliminada");
      setConfidencialTarget(null);
    } catch (err) {
      console.error("[Kanban] Error actualizando confidencialidad:", err);
      toast.error("No se pudo actualizar el pedido.");
    }
    setSavingConf(false);
  };

  const grouped = ESTADOS.reduce((acc, e) => {
    acc[e] = filtered.filter(p => p.estado === e);
    return acc;
  }, {});

  const activeCount = pedidos.filter(p => p.estado !== "Cerrado").length;

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Tablero Kanban</h1>
          <p className="text-xs text-slate-400 mt-0.5">{activeCount} pedidos activos · {pedidos.filter(p => p.estado === "Cerrado").length} cerrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex flex-wrap gap-2 items-center">
        <Select value={filters.responsable} onValueChange={v => setFilter("responsable", v)}>
          <SelectTrigger className="h-8 text-xs w-[130px] border-slate-200 bg-white"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__sin__" className="text-xs">Sin responsable</SelectItem>
            {responsables.sort().map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.solicitante} onValueChange={v => setFilter("solicitante", v)}>
          <SelectTrigger className="h-8 text-xs w-[130px] border-slate-200 bg-white"><SelectValue placeholder="Solicitante" /></SelectTrigger>
          <SelectContent>
            {[...new Set(pedidos.map(p => p.solicitante).filter(Boolean))].sort().map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.proceso} onValueChange={v => setFilter("proceso", v)}>
          <SelectTrigger className="h-8 text-xs w-[140px] border-slate-200 bg-white"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>{procesos.sort().map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.estado} onValueChange={v => setFilter("estado", v)}>
          <SelectTrigger className="h-8 text-xs w-[120px] border-slate-200 bg-white"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.prioridad} onValueChange={v => setFilter("prioridad", v)}>
          <SelectTrigger className="h-8 text-xs w-[100px] border-slate-200 bg-white"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-6">
          {ESTADOS.map(estado => (
            <KanbanColumn key={estado} status={estado} pedidos={grouped[estado]} onDelete={isAdmin ? setDeleteTarget : null} onArchive={isAdmin ? setArchiveTarget : null} onConfidencial={isAdmin ? setConfidencialTarget : null} />
          ))}
        </div>
      </DragDropContext>

      <ConfirmArchivarModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        archiving={archiving}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      <ConfirmConfidencialModal
        open={!!confidencialTarget}
        onClose={() => setConfidencialTarget(null)}
        onConfirm={handleConfidencial}
        marcar={confidencialTarget?.marcar}
        saving={savingConf}
      />

      {/* Block reason modal */}
      <Dialog open={!!blockModal} onOpenChange={() => setBlockModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-800">Motivo de bloqueo</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 mb-3">Registra brevemente por qué este pedido está bloqueado.</p>
          <Textarea
            value={blockModal?.motivo || ""}
            onChange={e => setBlockModal(m => ({ ...m, motivo: e.target.value }))}
            placeholder="Ej: Falta aprobación de gerencia..."
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setBlockModal(null)}>Omitir</Button>
            <Button size="sm" onClick={saveBlockMotivo}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}