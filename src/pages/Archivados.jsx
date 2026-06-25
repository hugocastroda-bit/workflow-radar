import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { Loader2, Search, X, ArchiveRestore, Eye } from "lucide-react";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";

export default function Archivados() {
  const navigate = useNavigate();
  const { user, empresaActiva } = useAuth();
  const isAdmin = user?.role === "admin" || ["Owner", "Admin"].includes(empresaActiva?.rol);

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ proceso: "", prioridad: "", responsable: "" });
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [procesosCatalogo, setProcesosCatalogo] = useState([]);
  const [prioridadesCatalogo, setPrioridadesCatalogo] = useState([]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      base44.entities.Pedido.filter({ archivado: true }, "-fecha_archivado"),
      base44.entities.Proceso.filter({ activo: true }, "nombre"),
      base44.entities.Prioridad.filter({ activo: true }, "nombre"),
    ])
      .then(([d, procs, prios]) => {
        setPedidos(d);
        setProcesosCatalogo(procs.map(p => p.nombre));
        setPrioridadesCatalogo(prios.map(p => p.nombre));
        setLoading(false);
      })
      .catch(() => { toast.error("No se pudieron cargar los archivados."); setLoading(false); });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm text-muted-foreground">Solo un usuario Admin puede archivar o consultar pedidos archivados.</p>
      </div>
    );
  }

  const responsables = [...new Set(pedidos.map(p => p.responsable).filter(Boolean))];

  const filtered = pedidos.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.titulo?.toLowerCase().includes(q) &&
        !p.solicitante?.toLowerCase().includes(q) &&
        !p.proceso?.toLowerCase().includes(q) &&
        !p.responsable?.toLowerCase().includes(q)) return false;
    if (filters.proceso && p.proceso !== filters.proceso) return false;
    if (filters.prioridad && p.prioridad !== filters.prioridad) return false;
    if (filters.responsable && p.responsable !== filters.responsable) return false;
    return true;
  });

  const hasFilters = search || Object.values(filters).some(Boolean);
  const clearFilters = () => { setSearch(""); setFilters({ proceso: "", prioridad: "", responsable: "" }); };

  const handleRestore = async () => {
    if (!restoreTarget || !isAdmin) return;
    setRestoring(true);
    try {
      await base44.entities.Pedido.update(restoreTarget.id, {
        archivado: false,
        fecha_archivado: null,
        archivado_por: null,
      });
      setPedidos(prev => prev.filter(p => p.id !== restoreTarget.id));
      eventBus.emit('pedidoRestaurado', restoreTarget);
      toast.success("Pedido restaurado correctamente");
      setRestoreTarget(null);
    } catch {
      toast.error("No se pudo restaurar el pedido.");
    }
    setRestoring(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Archivados</h1>
        <p className="text-xs text-muted-foreground mt-1">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""} archivado{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, solicitante..." className="pl-8 h-8 text-xs w-56" />
        </div>
        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <Select value={filters.proceso || "__placeholder__"} onValueChange={v => setFilters(f => ({ ...f, proceso: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {procesosCatalogo.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.prioridad || "__placeholder__"} onValueChange={v => setFilters(f => ({ ...f, prioridad: v === "__placeholder__" ? "" : v }))}>
          <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todas</SelectItem>
            {prioridadesCatalogo.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {responsables.length > 0 && (
          <Select value={filters.responsable || "__placeholder__"} onValueChange={v => setFilters(f => ({ ...f, responsable: v === "__placeholder__" ? "" : v }))}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
              {responsables.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
         <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors whitespace-nowrap">
           <X className="h-3 w-3" /> Limpiar filtros
         </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Proceso</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Responsable</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Archivado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Por</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="px-5 py-3">
                  <span className="font-medium text-foreground truncate max-w-[200px] block">{p.titulo}</span>
                  {p.motivo_archivo && (
                    <span className="text-muted-foreground text-xs truncate max-w-[200px] block">{p.motivo_archivo}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{p.solicitante}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.proceso}</td>
                <td className="px-4 py-3"><PriorityBadge priority={p.prioridad} /></td>
                <td className="px-4 py-3"><StatusBadge status={p.estado} /></td>
                <td className="px-4 py-3 text-muted-foreground">{p.responsable || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.fecha_archivado || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{p.archivado_por || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/pedido/${p.id}`)}
                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setRestoreTarget(p)}
                      className="p-1 rounded text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                      title="Restaurar pedido"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
             <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">No hay pedidos archivados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Restore confirmation */}
      <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">Restaurar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Deseas restaurar este pedido? Volverá a aparecer en la Bandeja y en el Kanban.
          </p>
          {restoreTarget && (
            <p className="text-xs text-muted-foreground font-medium bg-secondary rounded px-3 py-2 border border-border">
              {restoreTarget.titulo}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setRestoreTarget(null)} disabled={restoring}>Cancelar</Button>
            <Button size="sm" onClick={handleRestore} disabled={restoring}
             className="bg-success hover:bg-success/90 text-white">
              {restoring ? "Restaurando…" : "Sí, restaurar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}