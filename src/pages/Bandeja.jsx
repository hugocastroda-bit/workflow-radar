import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import RiesgoBadge from "../components/RiesgoBadge";
import PedidoForm from "../components/PedidoForm";
import { Plus, Search, AlertTriangle, Loader2, X, Trash2, Archive, Lock, LockOpen, FileSpreadsheet, ChevronRight, Inbox, Eye } from "lucide-react";
import ConfirmArchivarModal from "../components/ConfirmArchivarModal";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmConfidencialModal from "../components/ConfirmConfidencialModal";
import ConfidencialBadge from "../components/ConfidencialBadge";
import { filtrarConfidenciales } from "@/lib/confidencial";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";
import { uniqNorm } from "@/lib/uniq-utils";
import PullToRefresh from "@/components/PullToRefresh";
import SmartTabs from "@/components/SmartTabs";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

// Estado persistido a nivel de módulo: sobrevive desmontaje al cambiar de pestaña.
// Al regresar a Bandeja, los filtros y búsqueda se rehidratan sin parpadeos.
const _persisted = {
  search: "",
  filters: { estado: "", prioridad: "", proceso: "", responsable: "", solicitante: "" },
};

export default function Bandeja() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pedidos, setPedidos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  // Inicializar desde el estado persistido del módulo (sobrevive cambio de ruta)
  const [search, setSearch]     = useState(_persisted.search);
  const [filters, setFilters]   = useState(_persisted.filters);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("todos");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confidencialTarget, setConfidencialTarget] = useState(null); // { id, marcar }
  const [savingConf, setSavingConf] = useState(false);

  // Cargar pedidos y reaccionar a cambios de URL (crear=true, filtros por query)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("crear") === "true") setFormOpen(true);
    if (urlParams.get("filtro_estado") === "Bloqueado") setFilters(f => ({ ...f, estado: "Bloqueado" }));
    base44.entities.Pedido.filter({ archivado: false }, "-created_date")
      .then(d => setPedidos(filtrarConfidenciales(d, user)))
      .catch(err => { console.error("[Bandeja] Error cargando pedidos:", err); toast.error("No se pudieron cargar los pedidos."); })
      .finally(() => setLoading(false));
  }, [user, location.search]);

  // Escuchar eventos de cambios (se registran una sola vez)
  useEffect(() => {
    const u1 = eventBus.on('pedidoCreado', pedido => {
      const f = filtrarConfidenciales([pedido], user);
      if (f.length) setPedidos(prev => [pedido, ...prev]);
    });
    const u2 = eventBus.on('pedidoActualizado', pedido => setPedidos(prev => prev.map(p => p.id === pedido.id ? pedido : p)));
    const u3 = eventBus.on('pedidoArchivado', id => setPedidos(prev => prev.filter(p => p.id !== id)));
    const u4 = eventBus.on('pedidoRestaurado', pedido => {
      const f = filtrarConfidenciales([pedido], user);
      if (f.length) setPedidos(prev => [pedido, ...prev]);
    });
    const u5 = eventBus.on('pedidoEliminado', id => setPedidos(prev => prev.filter(p => p.id !== id)));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const ESTADOS_CONGELADOS = ["Nuevo", "Por priorizar"];
  const calcDiasEstancado = (p) =>
    Math.floor((Date.now() - new Date(p.updated_date || p.created_date)) / 86400000);

  const calcTiempoDesde = (p) => {
    const ms = Date.now() - new Date(p.updated_date || p.created_date);
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
    return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  };

  const colorAntiguedad = (p) => {
    const days = Math.floor((Date.now() - new Date(p.updated_date || p.created_date)) / 86400000);
    if (days > 14) return "text-alert font-medium";
    if (days > 7) return "text-warning font-medium";
    return "text-muted-foreground";
  };

  const calcSLA = (p) => {
    if (p.estado === "Cerrado") return null;
    const slaDate = p.fechaCompromiso || p.fecha_requerida;
    if (!slaDate) return null;
    const diffDays = (new Date(slaDate) - new Date(today)) / 86400000;
    if (diffDays < 0) return { type: "red", label: "SLA vencido" };
    if (diffDays <= 3) return { type: "yellow", label: "Próximo a vencer" };
    return { type: "green", label: "Dentro del SLA" };
  };

  const slaColors = { green: "bg-emerald-500", yellow: "bg-yellow-500", red: "bg-red-500" };

  const isVencidoFilter = new URLSearchParams(location.search).get("filtro_estado") === "vencidos";

  const tabFiltered = pedidos.filter(p => {
    if (activeTab === "mis")             return p.responsable === user?.full_name;
    if (activeTab === "asignar")         return !p.responsable;
    if (activeTab === "vencidos")        return p.fecha_requerida < today && p.estado !== "Cerrado";
    if (activeTab === "bloqueados")      return p.estado === "Bloqueado";
    if (activeTab === "sin_responsable") return !p.responsable;
    return true;
  });

  const tabCounts = {
    todos:           pedidos.length,
    mis:             pedidos.filter(p => p.responsable === user?.full_name).length,
    asignar:         pedidos.filter(p => !p.responsable).length,
    vencidos:        pedidos.filter(p => p.fecha_requerida < today && p.estado !== "Cerrado").length,
    bloqueados:      pedidos.filter(p => p.estado === "Bloqueado").length,
    sin_responsable: pedidos.filter(p => !p.responsable).length,
  };

  const filtered = tabFiltered.filter(p => {
    if (search && !p.titulo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.solicitante?.toLowerCase().includes(search.toLowerCase()) &&
        !p.responsable?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.estado      && p.estado      !== filters.estado)      return false;
    if (filters.prioridad   && p.prioridad   !== filters.prioridad)   return false;
    if (filters.proceso     && p.proceso     !== filters.proceso)     return false;
    if (filters.responsable && (filters.responsable === "__sin__" ? !!p.responsable : p.responsable !== filters.responsable)) return false;
    if (filters.solicitante && p.solicitante !== filters.solicitante) return false;
    if (isVencidoFilter && !(p.fecha_requerida < today && p.estado !== "Cerrado")) return false;
    return true;
  });

  // Sincronizar cambios de filtros/búsqueda al estado persistido del módulo
  const handleSetSearch = (val) => { _persisted.search = val; setSearch(val); };
  const handleSetFilters = (updater) => {
    setFilters(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      _persisted.filters = next;
      return next;
    });
  };

  const hasFilters = Object.values(filters).some(Boolean) || search || isVencidoFilter;
  const clearFilters = () => {
    const empty = { estado: "", prioridad: "", proceso: "", responsable: "", solicitante: "" };
    _persisted.filters = empty;
    _persisted.search = "";
    setFilters(empty);
    setSearch("");
    window.history.replaceState({}, "", "/bandeja");
  };

  const handleArchive = async (motivo) => {
    if (!isAdmin || !archiveTarget) return;
    setArchiving(true);
    try {
      await base44.entities.Pedido.update(archiveTarget, {
        archivado: true,
        fecha_archivado: new Date().toISOString().split("T")[0],
        archivado_por: user?.full_name || user?.email || "Admin",
        ...(motivo ? { motivo_archivo: motivo } : {}),
      });
      setPedidos(prev => prev.filter(p => p.id !== archiveTarget));
      eventBus.emit('pedidoArchivado', archiveTarget);
      setArchiveTarget(null);
      toast.success("Pedido archivado correctamente");
    } catch (err) {
      console.error("[Bandeja] Error archivando pedido:", err);
      toast.error("No se pudo archivar el pedido. Inténtalo nuevamente.");
    }
    setArchiving(false);
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      await base44.entities.Pedido.delete(deleteTarget);
      setPedidos(prev => prev.filter(p => p.id !== deleteTarget));
      eventBus.emit('pedidoEliminado', deleteTarget);
      setDeleteTarget(null);
      toast.success("Pedido borrado correctamente");
    } catch (err) {
      console.error("[Bandeja] Error borrando pedido:", err);
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
        } : {
          marcado_confidencial_por: null,
          fecha_marcado_confidencial: null,
          motivo_confidencial: null,
        }),
      });
      setPedidos(prev => prev.map(p => p.id === confidencialTarget.id ? { ...p, confidencial: marcar } : p));
      toast.success(marcar ? "Pedido marcado como confidencial" : "Confidencialidad eliminada");
      setConfidencialTarget(null);
    } catch (err) {
      console.error("[Bandeja] Error actualizando confidencialidad:", err);
      toast.error("No se pudo actualizar el pedido.");
    }
    setSavingConf(false);
  };

  const [updatingEstado, setUpdatingEstado] = useState(null); // pedido id en proceso

  const handleChangeEstado = async (pedidoId, nuevoEstado) => {
    setUpdatingEstado(pedidoId);
    try {
      const datos = { estado: nuevoEstado };
      if (nuevoEstado === "Cerrado") datos.fecha_cierre_real = new Date().toISOString().split("T")[0];
      const updated = await base44.entities.Pedido.update(pedidoId, datos);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, ...datos } : p));
      eventBus.emit('pedidoActualizado', updated);
      toast.success(`Estado actualizado a "${nuevoEstado}"`);
    } catch (err) {
      console.error("[Bandeja] Error cambiando estado:", err);
      toast.error("No se pudo actualizar el estado.");
    }
    setUpdatingEstado(null);
  };

  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    setExporting(true);
    const data = filtered.map(p => ({
      "Título": p.titulo,
      "Solicitante": p.solicitante,
      "Responsable": p.responsable || "—",
      "Proceso": p.proceso,
      "Prioridad": p.prioridad,
      "Estado": p.estado,
      "Fecha Requerida": p.fecha_requerida || "—",
      "Comentarios de Avance": p.comentarios_avance || "—",
      "Próxima Acción": p.proxima_accion || "—",
      "Confidencial": p.confidencial ? "Sí" : "No",
      "Creado": p.created_date?.split("T")[0] || "—",
      "Actualizado": p.updated_date?.split("T")[0] || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`Exportados ${data.length} pedidos`);
    setExporting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const handleRefresh = async () => {
    const d = await base44.entities.Pedido.filter({ archivado: false }, "-created_date");
    setPedidos(filtrarConfidenciales(d, user));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bandeja de pedidos</h1>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{isVencidoFilter ? " vencidos" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportToExcel} disabled={filtered.length === 0 || exporting} className="gap-1.5">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{exporting ? "Exportando…" : "Exportar a Excel"}</span>
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nuevo pedido
          </Button>
        </div>
      </div>

      <SmartTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      {/* ── Cards resumen ──────────────────────────────── */}
      {(() => {
        const activos = pedidos.filter(p => p.estado !== "Cerrado").length;
        const vencidos = pedidos.filter(p => p.fecha_requerida < today && p.estado !== "Cerrado").length;
        const bloqueados = pedidos.filter(p => p.estado === "Bloqueado").length;
        const sinResponsable = pedidos.filter(p => !p.responsable).length;
        const fueraTimeBox = pedidos.filter(p => p.horasEstimadas != null && p.horasReales != null && p.horasEstimadas > 0 && p.horasReales > p.horasEstimadas).length;
        const cargaPorResp = {};
        pedidos.filter(p => p.estado !== "Cerrado" && p.responsable).forEach(p => {
          const resp = p.responsable.trim();
          cargaPorResp[resp] = (cargaPorResp[resp] || 0) + 1;
        });
        const sobreCapacidad = Object.values(cargaPorResp).filter(c => c > 5).length;
        const cards = [
          { label: "Activos", count: activos, left: "border-l-primary", num: "text-primary", bg: "bg-accent/70 dark:bg-accent/20" },
          { label: "Vencidos", count: vencidos, left: "border-l-alert", num: "text-alert", bg: "bg-alert/10 dark:bg-alert/10" },
          { label: "Bloqueados", count: bloqueados, left: "border-l-warning", num: "text-warning", bg: "bg-warning/10 dark:bg-warning/10" },
          { label: "Sin responsable", count: sinResponsable, left: "border-l-muted-foreground/40", num: "text-muted-foreground", bg: "bg-muted/50 dark:bg-muted/30" },
          { label: "Fuera de Time Box", count: fueraTimeBox, left: "border-l-purple-400", num: "text-purple-600 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/20" },
          { label: "Sobre capacidad", count: sobreCapacidad, left: "border-l-amber-400", num: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/20" },
        ];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {cards.map(c => (
              <div key={c.label} className={`flex items-center gap-2.5 rounded-lg border-l-4 ${c.left} ${c.bg} px-3 py-2.5 border-y border-r border-border`}>
                <span className={`text-xl font-bold leading-none ${c.num}`}>{c.count}</span>
                <span className="text-xs text-muted-foreground leading-tight">{c.label}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => handleSetSearch(e.target.value)} placeholder="Buscar por título, solicitante..." className="pl-8 h-8 text-xs w-56" />
        </div>
        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <Select value={filters.responsable || "__placeholder__"} onValueChange={v => handleSetFilters(f => ({ ...f, responsable: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            <SelectItem value="__sin__" className="text-xs">Sin responsable</SelectItem>
            {uniqNorm(pedidos.map(p => p.responsable)).map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.solicitante || "__placeholder__"} onValueChange={v => handleSetFilters(f => ({ ...f, solicitante: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Solicitante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {uniqNorm(pedidos.map(p => p.solicitante)).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.proceso || "__placeholder__"} onValueChange={v => handleSetFilters(f => ({ ...f, proceso: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {uniqNorm(pedidos.map(p => p.proceso)).map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.estado || "__placeholder__"} onValueChange={v => handleSetFilters(f => ({ ...f, estado: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {ESTADOS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.prioridad || "__placeholder__"} onValueChange={v => handleSetFilters(f => ({ ...f, prioridad: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todas</SelectItem>
            {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors whitespace-nowrap">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-lg px-6 py-14 flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No se encontraron pedidos</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters ? "Prueba ajustando o limpiando los filtros activos." : "Crea el primer pedido para comenzar."}
            </p>
          </div>
          {hasFilters ? (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
              Limpiar filtros
            </button>
          ) : (
            <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Nuevo pedido
            </button>
          )}
        </div>
      )}

      {/* Mobile card list */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2">
          {filtered.map(p => {
            const isOverdue = p.fecha_requerida < today && p.estado !== "Cerrado";
            const dias = calcDiasEstancado(p);
            return (
              <div key={p.id} onClick={() => navigate(`/pedido/${p.id}`)}
                className={`bg-card border rounded-lg px-4 py-3 cursor-pointer active:bg-secondary/40 transition-colors ${isOverdue ? "border-l-4 border-l-alert border-t-border border-r-border border-b-border" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-alert flex-shrink-0" />}
                      <span className="text-sm font-medium text-foreground line-clamp-2">{p.titulo}</span>
                      {(() => { const sla = calcSLA(p); return sla && <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${slaColors[sla.type]}`} title={sla.label} />; })()}
                      {p.confidencial && <ConfidencialBadge size="xs" />}
                    </div>
                    {ESTADOS_CONGELADOS.includes(p.estado) && dias >= 7 && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-warning/10 text-warning border-warning/30 animate-pulse">
                        ⚠️ Hace {dias} días sin gestión
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <StatusBadge status={p.estado} />
                      <PriorityBadge priority={p.prioridad} />
                      {p.riesgo && <RiesgoBadge riesgo={p.riesgo} size="xs" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                      {p.solicitante && <span>{p.solicitante}</span>}
                      {p.responsable && <span>→ {p.responsable}</span>}
                      {p.fecha_requerida && <span className={isOverdue ? "text-alert font-medium" : ""}>{p.fecha_requerida}</span>}
                    </div>
                    {p.horasEstimadas != null ? (() => {
                      const minsEst = Math.round(p.horasEstimadas * 60);
                      const minsReal = Math.round((p.horasReales ?? 0) * 60);
                      const ratio = minsEst > 0 ? minsReal / minsEst : 0;
                      const over = ratio > 1;
                      return (
                        <span className={`text-[10px] font-medium whitespace-nowrap mt-1 inline-block ${
                          over ? "text-alert" : ratio >= 0.8 ? "text-warning" : "text-success"
                        }`}>
                          {over ? "⚠ " : "⏱ "}{minsReal} min / {minsEst} min
                        </span>
                      );
                    })() : (
                      <span className="text-[10px] text-muted-foreground/40 mt-1 inline-block">⏱ — min</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <>
                        <button onClick={() => setConfidencialTarget({ id: p.id, marcar: !p.confidencial })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label={p.confidencial ? "Quitar confidencialidad" : "Marcar como confidencial"}>
                          {p.confidencial ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setArchiveTarget(p.id)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Archivar pedido">
                          <Archive className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(p.id)} className="p-1.5 rounded text-muted-foreground hover:text-alert hover:bg-alert/10 transition-colors" aria-label="Borrar pedido">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Título</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[110px]">Solicitante</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[110px]">Responsable</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[105px]">Estado</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[80px]">Prioridad</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[95px]">Proceso</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[85px]">Fecha req.</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[85px]">Time Box</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[11px] w-[105px]">Última actualización</th>
                <th className="px-2 py-3 w-[100px] text-center text-muted-foreground uppercase tracking-wider text-[11px] font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOverdue = p.fecha_requerida < today && p.estado !== "Cerrado";
                return (
                  <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)}
                    className={`border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/40 transition-colors ${isOverdue ? "bg-alert/5" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {isOverdue && <AlertTriangle className="h-3 w-3 text-alert flex-shrink-0" />}
                        <span className="font-medium text-foreground truncate" title={p.titulo}>{p.titulo}</span>
                        {(() => { const sla = calcSLA(p); return sla && <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${slaColors[sla.type]}`} title={sla.label} />; })()}
                        {p.confidencial && <ConfidencialBadge size="xs" />}
                      </div>
                      {(() => {
                        const dias = calcDiasEstancado(p);
                        return ESTADOS_CONGELADOS.includes(p.estado) && dias >= 7 ? (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border
                            bg-warning/10 text-warning border-warning/30
                            dark:bg-[#331B00] dark:text-[#FF9F00] dark:border-[#5C3200] animate-pulse">
                            ⚠️ Hace {dias} días sin gestión
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground truncate" title={p.solicitante || ""}>{p.solicitante}</td>
                    <td className="px-3 py-3 text-muted-foreground truncate" title={p.responsable || ""}>{p.responsable || "—"}</td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Select
                        value={p.estado}
                        onValueChange={v => handleChangeEstado(p.id, v)}
                        disabled={updatingEstado === p.id}
                      >
                        <SelectTrigger className="h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 w-auto gap-1 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground/50">
                          <SelectValue>
                            <StatusBadge status={p.estado} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map(e => (
                            <SelectItem key={e} value={e} className="text-xs">
                              <StatusBadge status={e} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <PriorityBadge priority={p.prioridad} />
                        {p.riesgo && <RiesgoBadge riesgo={p.riesgo} size="xs" />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground truncate" title={p.proceso || ""}>{p.proceso}</td>
                    <td className={`px-3 py-3 font-medium whitespace-nowrap ${isOverdue ? "text-alert" : "text-muted-foreground"}`}>{p.fecha_requerida}</td>
                    <td className="px-3 py-3">
                     {p.horasEstimadas != null ? (() => {
                       const minsEst = Math.round(p.horasEstimadas * 60);
                       const minsReal = Math.round((p.horasReales ?? 0) * 60);
                       const ratio = minsEst > 0 ? minsReal / minsEst : 0;
                       const over = ratio > 1;
                       return (
                         <span className={`text-[11px] font-medium whitespace-nowrap ${
                           over ? "text-alert" : ratio >= 0.8 ? "text-warning" : "text-success"
                         }`}>
                           {over ? "⚠ " : "⏱ "}
                           {minsReal} min / {minsEst} min
                         </span>
                       );
                     })() : (
                       <span className="text-[11px] text-muted-foreground">Sin estimación</span>
                     )}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-[11px] ${colorAntiguedad(p)}`} title={p.updated_date ? new Date(p.updated_date).toLocaleString("es-PE") : (p.created_date ? new Date(p.created_date).toLocaleString("es-PE") : "")}>
                      {calcTiempoDesde(p)}
                    </td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => navigate(`/pedido/${p.id}`)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver detalle">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => setConfidencialTarget({ id: p.id, marcar: !p.confidencial })} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={p.confidencial ? "Quitar confidencialidad" : "Marcar confidencial"}>
                              {p.confidencial ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => setArchiveTarget(p.id)} className="p-1 rounded text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Archivar">
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(p.id)} className="p-1 rounded text-muted-foreground hover:text-alert hover:bg-alert/10 transition-colors" title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

      <PedidoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        pedido={null}
        onSaved={(saved) => {
          if (saved) {
            const filtrado = filtrarConfidenciales([saved], user);
            if (filtrado.length > 0) setPedidos(prev => [saved, ...prev]);
          } else {
            base44.entities.Pedido.filter({ archivado: false }, "-created_date")
              .then(d => setPedidos(filtrarConfidenciales(d, user)));
          }
        }}
      />
    </div>
    </PullToRefresh>
  );
}