import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio } from "@/lib/EspacioContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { Loader2, Search, X, ArchiveRestore, Eye } from "lucide-react";
import { toast } from "sonner";

const PROCESOS = ["Selección","Bienestar","SST","Clima","Liderazgo","ACI","Onboarding","Comunicaciones internas","Legal laboral","Compensaciones","Gestión de talento","Otros"];
const PRIORIDADES = ["Alta","Media","Baja"];

export default function Archivados() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { espacioActivo } = useEspacio();
  const isAdmin = user?.role === "admin";

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ proceso: "", prioridad: "", responsable: "" });
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    if (!espacioActivo?.id) { setLoading(false); return; }
    base44.entities.Pedido.filter({ archivado: true, espacioId: espacioActivo.id }, "-fecha_archivado")
      .then(d => { setPedidos(d); setLoading(false); });
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
      toast.success("Pedido restaurado correctamente");
      setRestoreTarget(null);
    } catch {
      toast.error("No se pudo restaurar el pedido.");
    }
    setRestoring(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Archivados</h1>
        <p className="text-xs text-slate-400 mt-0.5">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""} archivado{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, solicitante..." className="pl-8 h-8 text-xs w-60" />
        </div>
        <Select value={filters.proceso} onValueChange={v => setFilters(f => ({ ...f, proceso: v }))}>
          <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.prioridad} onValueChange={v => setFilters(f => ({ ...f, prioridad: v }))}>
          <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
        {responsables.length > 0 && (
          <Select value={filters.responsable} onValueChange={v => setFilters(f => ({ ...f, responsable: v }))}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>{responsables.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors">
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 font-medium text-slate-500 uppercase tracking-wider">Título</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Solicitante</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Proceso</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Responsable</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Archivado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Por</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <span className="font-medium text-slate-700 truncate max-w-[200px] block">{p.titulo}</span>
                  {p.motivo_archivo && (
                    <span className="text-slate-400 text-xs truncate max-w-[200px] block">{p.motivo_archivo}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.solicitante}</td>
                <td className="px-4 py-3 text-slate-400">{p.proceso}</td>
                <td className="px-4 py-3"><PriorityBadge priority={p.prioridad} /></td>
                <td className="px-4 py-3"><StatusBadge status={p.estado} /></td>
                <td className="px-4 py-3 text-slate-400">{p.responsable || "—"}</td>
                <td className="px-4 py-3 text-slate-400">{p.fecha_archivado || "—"}</td>
                <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{p.archivado_por || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/pedido/${p.id}`)}
                      className="p-1 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setRestoreTarget(p)}
                      className="p-1 rounded text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Restaurar pedido"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No hay pedidos archivados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Restore confirmation */}
      <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Restaurar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Deseas restaurar este pedido? Volverá a aparecer en la Bandeja y en el Kanban.
          </p>
          {restoreTarget && (
            <p className="text-xs text-muted-foreground font-medium bg-slate-50 rounded px-3 py-2 border">
              {restoreTarget.titulo}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setRestoreTarget(null)} disabled={restoring}>Cancelar</Button>
            <Button size="sm" onClick={handleRestore} disabled={restoring}
              className="bg-emerald-700 hover:bg-emerald-600 text-white">
              {restoring ? "Restaurando…" : "Sí, restaurar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}