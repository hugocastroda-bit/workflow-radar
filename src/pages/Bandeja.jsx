import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import PedidoForm from "../components/PedidoForm";
import { Plus, Search, AlertTriangle, Loader2, X } from "lucide-react";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const SEDES = ["Clínica Delgado", "Clínica Bellavista", "OncoCenter", "Cantella", "Medicina Nuclear", "Asistencia Médica", "Corporativo", "Otro"];
const PROCESOS = ["Selección", "Bienestar", "SST", "Clima", "Liderazgo", "ACI", "Onboarding", "Comunicaciones internas", "Legal laboral", "Compensaciones", "Gestión de talento", "Otros"];

export default function Bandeja() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editPedido, setEditPedido] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ estado: "", prioridad: "", sede: "", proceso: "", responsable: "" });

  const urlParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    if (urlParams.get("crear") === "true") {
      setFormOpen(true);
    }
    if (urlParams.get("filtro_estado") === "Bloqueado") {
      setFilters(prev => ({ ...prev, estado: "Bloqueado" }));
    }
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const data = await base44.entities.Pedido.list("-created_date");
    setPedidos(data);
    setLoading(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const isVencidoFilter = urlParams.get("filtro_estado") === "vencidos";

  const filtered = pedidos.filter(p => {
    if (search && !p.titulo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.solicitante?.toLowerCase().includes(search.toLowerCase()) &&
        !p.responsable?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.estado && p.estado !== filters.estado) return false;
    if (filters.prioridad && p.prioridad !== filters.prioridad) return false;
    if (filters.sede && p.sede !== filters.sede) return false;
    if (filters.proceso && p.proceso !== filters.proceso) return false;
    if (filters.responsable && p.responsable !== filters.responsable) return false;
    if (isVencidoFilter && !(p.fecha_requerida < today && p.estado !== "Cerrado")) return false;
    return true;
  });

  const responsables = [...new Set(pedidos.map(p => p.responsable).filter(Boolean))];
  const hasActiveFilters = Object.values(filters).some(Boolean) || search || isVencidoFilter;

  const clearFilters = () => {
    setFilters({ estado: "", prioridad: "", sede: "", proceso: "", responsable: "" });
    setSearch("");
    window.history.replaceState({}, "", "/bandeja");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bandeja de pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
            {isVencidoFilter ? " vencidos" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditPedido(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Select value={filters.estado} onValueChange={v => setFilters(f => ({ ...f, estado: v }))}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.prioridad} onValueChange={v => setFilters(f => ({ ...f, prioridad: v }))}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.sede} onValueChange={v => setFilters(f => ({ ...f, sede: v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sede" /></SelectTrigger>
          <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.proceso} onValueChange={v => setFilters(f => ({ ...f, proceso: v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        {responsables.length > 0 && (
          <Select value={filters.responsable} onValueChange={v => setFilters(f => ({ ...f, responsable: v }))}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>{responsables.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Responsable</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Proceso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sede</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha req.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOverdue = p.fecha_requerida < today && p.estado !== "Cerrado";
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/pedido/${p.id}`)}
                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                      isOverdue ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                        <span className="font-medium text-foreground truncate max-w-[250px]">{p.titulo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.solicitante}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.responsable || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.estado} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={p.prioridad} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.proceso}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.sede}</td>
                    <td className={`px-4 py-3 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {p.fecha_requerida}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron pedidos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PedidoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        pedido={editPedido}
        onSaved={loadPedidos}
      />
    </div>
  );
}