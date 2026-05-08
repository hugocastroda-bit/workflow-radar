import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "../components/KanbanColumn";
import { Loader2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

export default function Kanban() {
  const [pedidos, setPedidos]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState({ responsable: "", prioridad: "", proceso: "" });
  const [blockModal, setBlockModal]   = useState(null); // { id, motivo }

  useEffect(() => {
    base44.entities.Pedido.list("-created_date").then(d => { setPedidos(d); setLoading(false); });
  }, []);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ responsable: "", prioridad: "", proceso: "" });
  const hasFilters = Object.values(filters).some(Boolean);

  const responsables = [...new Set(pedidos.map(p => p.responsable).filter(Boolean))];
  const procesos     = [...new Set(pedidos.map(p => p.proceso).filter(Boolean))];

  const filtered = pedidos.filter(p => {
    if (filters.responsable && p.responsable !== filters.responsable) return false;
    if (filters.prioridad   && p.prioridad   !== filters.prioridad)   return false;
    if (filters.proceso     && p.proceso     !== filters.proceso)     return false;
    return true;
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newEstado = destination.droppableId;
    const pedido = pedidos.find(p => p.id === draggableId);
    if (!pedido || pedido.estado === newEstado) return;

    // Optimistic update
    setPedidos(prev => prev.map(p => p.id === draggableId ? { ...p, estado: newEstado } : p));

    if (newEstado === "Bloqueado") {
      setBlockModal({ id: draggableId, motivo: pedido.motivo_bloqueo || "" });
    }

    const updateData = { estado: newEstado };
    if (newEstado === "Cerrado") {
      updateData.fecha_cierre_real = new Date().toISOString().split("T")[0];
    }
    await base44.entities.Pedido.update(draggableId, updateData);
  };

  const saveBlockMotivo = async () => {
    if (!blockModal) return;
    await base44.entities.Pedido.update(blockModal.id, { motivo_bloqueo: blockModal.motivo });
    setPedidos(prev => prev.map(p => p.id === blockModal.id ? { ...p, motivo_bloqueo: blockModal.motivo } : p));
    setBlockModal(null);
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
      <div className="flex flex-wrap gap-2 items-center">
        {responsables.length > 0 && (
          <Select value={filters.responsable} onValueChange={v => setFilter("responsable", v)}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>{responsables.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={filters.prioridad} onValueChange={v => setFilter("prioridad", v)}>
          <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {procesos.length > 0 && (
          <Select value={filters.proceso} onValueChange={v => setFilter("proceso", v)}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
            <SelectContent>{procesos.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-6">
          {ESTADOS.map(estado => (
            <KanbanColumn key={estado} status={estado} pedidos={grouped[estado]} />
          ))}
        </div>
      </DragDropContext>

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