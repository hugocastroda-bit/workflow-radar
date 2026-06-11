import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "../components/KanbanColumn";
import { Loader2, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import ConfirmArchivarModal from "../components/ConfirmArchivarModal";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmConfidencialModal from "../components/ConfirmConfidencialModal";
import { filtrarConfidenciales } from "@/lib/confidencial";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { eventBus } from "@/lib/eventBus";
import PullToRefresh from "@/components/PullToRefresh";
import SmartTabs from "@/components/SmartTabs";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

const STAGE_COLORS = {
  "Nuevo":        { accent: "#0066CC",  background: "#EAF3FF", dark: "#002244" },
  "Por priorizar":{ accent: "#8E8E93",  background: "#F0F0F5", dark: "#1A1C23" },
  "Asignado":     { accent: "#00A3E0",  background: "#E6F7FF", dark: "#002B3D" },
  "En curso":     { accent: "#34C759",  background: "#E9F8EF", dark: "#092D1A" },
  "Bloqueado":    { accent: "#FF9500",  background: "#FFF4E5", dark: "#331B00" },
  "En revisión":  { accent: "#AF52DE",  background: "#F3ECFF", dark: "#20003B" },
  "Cerrado":      { accent: "#30A46C",  background: "#E6F4EA", dark: "#052E16" },
};

const QUERY_KEY = ['pedidos-kanban'];

export default function Kanban() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [filters, setFilters]         = useState({ responsable: "", prioridad: "", proceso: "", solicitante: "", estado: "" });
  const [blockModal, setBlockModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confidencialTarget, setConfidencialTarget] = useState(null);
  const [savingConf, setSavingConf] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  // ── React Query: carga de pedidos ───────────────────────────────
  const { data: pedidosRaw = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => base44.entities.Pedido.filter({ archivado: false }, "-created_date"),
  });

  const pedidos = filtrarConfidenciales(pedidosRaw, user);

  // ── Sincronizar eventBus → caché React Query ─────────────────────
  useEffect(() => {
    const setPedidoEnCache = (pedido) =>
      queryClient.setQueryData(QUERY_KEY, (prev = []) =>
        prev.some(p => p.id === pedido.id)
          ? prev.map(p => p.id === pedido.id ? pedido : p)
          : [pedido, ...prev]
      );
    const removePedidoDeCache = (id) =>
      queryClient.setQueryData(QUERY_KEY, (prev = []) => prev.filter(p => p.id !== id));

    const u1 = eventBus.on('pedidoCreado',      (p) => setPedidoEnCache(p));
    const u2 = eventBus.on('pedidoActualizado', (p) => setPedidoEnCache(p));
    const u3 = eventBus.on('pedidoArchivado',   (id) => removePedidoDeCache(id));
    const u4 = eventBus.on('pedidoRestaurado',  (p) => setPedidoEnCache(p));
    const u5 = eventBus.on('pedidoEliminado',   (id) => removePedidoDeCache(id));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [queryClient]);

  // ── Mutación optimista: mover tarjeta ───────────────────────────
  const moverTarjeta = useMutation({
    mutationFn: ({ id, estado, fechaCierre }) => {
      const data = { estado };
      if (fechaCierre) data.fecha_cierre_real = fechaCierre;
      return base44.entities.Pedido.update(id, data);
    },
    onMutate: async ({ id, estado }) => {
      // 1. Cancelar queries en segundo plano para evitar sobreescrituras
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      // 2. Guardar snapshot
      const snapshot = queryClient.getQueryData(QUERY_KEY);
      // 3. Actualizar caché optimistamente
      queryClient.setQueryData(QUERY_KEY, (prev = []) =>
        prev.map(p => p.id === id ? { ...p, estado } : p)
      );
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      // Rollback al snapshot
      if (context?.snapshot) {
        queryClient.setQueryData(QUERY_KEY, context.snapshot);
      }
      toast.error("No se pudo actualizar el estado del pedido. Inténtalo de nuevo.");
    },
    onSuccess: (updatedPedido) => {
      eventBus.emit('pedidoActualizado', updatedPedido);
    },
    onSettled: () => {
      // Resync final con la BD
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => { setFilters({ responsable: "", prioridad: "", proceso: "", solicitante: "", estado: "" }); setSearch(""); };
  const hasFilters = Object.values(filters).some(Boolean) || !!search;

  const uniq = (arr) => {
    const seen = new Set();
    const result = [];
    for (const v of arr) {
      if (!v || typeof v !== "string") continue;
      const clean = v.trim().split(" — ")[0].trim(); // quitar "— email" si existe
      const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
      if (!seen.has(key)) { seen.add(key); result.push(clean); }
    }
    return result.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  };
  const responsables = uniq(pedidos.map(p => p.responsable));
  const solicitantes = uniq(pedidos.map(p => p.solicitante));
  const procesos     = uniq(pedidos.map(p => p.proceso));

  const tabFiltered = pedidos.filter(p => {
    if (activeTab === "mis")     return p.responsable === user?.full_name;
    if (activeTab === "asignar") return !p.responsable;
    return true;
  });

  const tabCounts = {
    todos:   pedidos.length,
    mis:     pedidos.filter(p => p.responsable === user?.full_name).length,
    asignar: pedidos.filter(p => !p.responsable).length,
  };

  const filtered = tabFiltered.filter(p => {
    if (search && !p.titulo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.solicitante?.toLowerCase().includes(search.toLowerCase()) &&
        !p.responsable?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.responsable && (filters.responsable === "__sin__" ? !!p.responsable : p.responsable !== filters.responsable)) return false;
    if (filters.prioridad   && p.prioridad   !== filters.prioridad)   return false;
    if (filters.proceso     && p.proceso     !== filters.proceso)     return false;
    if (filters.solicitante && p.solicitante !== filters.solicitante) return false;
    if (filters.estado      && p.estado      !== filters.estado)      return false;
    return true;
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newEstado = destination.droppableId;
    const pedido = pedidos.find(p => p.id === draggableId);
    if (!pedido || pedido.estado === newEstado) return;

    if (newEstado === "Bloqueado") {
      setBlockModal({ id: draggableId, motivo: pedido.motivo_bloqueo || "" });
    }

    moverTarjeta.mutate({
      id: draggableId,
      estado: newEstado,
      fechaCierre: newEstado === "Cerrado" ? new Date().toISOString().split("T")[0] : null,
    });
  };

  const saveBlockMotivo = async () => {
    if (!blockModal) return;
    try {
      await base44.entities.Pedido.update(blockModal.id, { motivo_bloqueo: blockModal.motivo });
      queryClient.setQueryData(QUERY_KEY, (prev = []) => prev.map(p => p.id === blockModal.id ? { ...p, motivo_bloqueo: blockModal.motivo } : p));
      setBlockModal(null);
      toast.success("Motivo de bloqueo guardado");
    } catch (err) {
      console.error("[Kanban] Error guardando motivo:", err);
      toast.error("No se pudo guardar el motivo de bloqueo.");
    }
  };

  const handleArchive = async (motivo) => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await base44.entities.Pedido.update(archiveTarget.id, {
        archivado: true,
        fecha_archivado: new Date().toISOString().split("T")[0],
        archivado_por: user?.full_name || user?.email || "Admin",
        ...(motivo ? { motivo_archivo: motivo } : {}),
      });
      queryClient.setQueryData(QUERY_KEY, (prev = []) => prev.filter(p => p.id !== archiveTarget.id));
      setArchiveTarget(null);
      toast.success("Pedido archivado correctamente");
      eventBus.emit('pedidoArchivado', archiveTarget.id);
    } catch (err) {
      console.error("[Kanban] Error archivando:", err);
      toast.error("No se pudo archivar el pedido.");
    }
    setArchiving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Pedido.delete(deleteTarget.id);
      queryClient.setQueryData(QUERY_KEY, (prev = []) => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Pedido borrado correctamente");
      eventBus.emit('pedidoEliminado', deleteTarget.id);
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
      queryClient.setQueryData(QUERY_KEY, (prev = []) => prev.map(p => p.id === confidencialTarget.id ? { ...p, confidencial: marcar } : p));
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

  useEffect(() => {
    checkScroll();
  }, [pedidos]);

  const activeCount = pedidos.filter(p => p.estado !== "Cerrado").length;

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tablero Kanban</h1>
          <p className="text-xs text-muted-foreground mt-1">{activeCount} pedidos activos · {pedidos.filter(p => p.estado === "Cerrado").length} cerrados</p>
        </div>
      </div>

      <SmartTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg px-3 py-2.5 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-xs w-44" />
        </div>
        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <Select value={filters.responsable || "__placeholder__"} onValueChange={v => setFilter("responsable", v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            <SelectItem value="__sin__" className="text-xs">Sin responsable</SelectItem>
            {responsables.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.solicitante || "__placeholder__"} onValueChange={v => setFilter("solicitante", v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Solicitante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {solicitantes.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.proceso || "__placeholder__"} onValueChange={v => setFilter("proceso", v === "__placeholder__" ? "" : v)}>
         <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {procesos.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.estado || "__placeholder__"} onValueChange={v => setFilter("estado", v === "__placeholder__" ? "" : v)}>
         <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {ESTADOS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.prioridad || "__placeholder__"} onValueChange={v => setFilter("prioridad", v === "__placeholder__" ? "" : v)}>
         <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todas</SelectItem>
            {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
         <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors whitespace-nowrap">
           <X className="h-3 w-3" /> Limpiar filtros
         </button>
        )}
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="relative">
          {/* Botón izquierdo */}
          {canScrollLeft && (
            <button
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3 bg-card border border-border shadow-md rounded-full w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-3 overflow-x-auto pb-6 -mx-1 px-1 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onMouseEnter={checkScroll}
          >
            {ESTADOS.map(estado => {
             const colors = STAGE_COLORS[estado];
             return (
               <KanbanColumn
                 key={estado}
                 status={estado}
                 pedidos={grouped[estado]}
                 onDelete={isAdmin ? setDeleteTarget : null}
                 onArchive={isAdmin ? setArchiveTarget : null}
                 onConfidencial={isAdmin ? setConfidencialTarget : null}
                 accentColor={colors.accent}
                 backgroundColor={isDark ? colors.dark : colors.background}
               />
             );
            })}
          </div>

          {/* Botón derecho */}
          {canScrollRight && (
            <button
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3 bg-card border border-border shadow-md rounded-full w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
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
            <DialogTitle className="text-sm font-semibold text-foreground">Motivo de bloqueo</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">Registra brevemente por qué este pedido está bloqueado.</p>
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
    </PullToRefresh>
  );
}