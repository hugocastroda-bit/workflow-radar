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

const ESTADOS    = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const SEDES      = ["Clínica Delgado", "Clínica Bellavista", "OncoCenter", "Cantella", "Medicina Nuclear", "Asistencia Médica", "Corporativo", "Otro"];
const PROCESOS   = ["Selección", "Bienestar", "SST", "Clima", "Liderazgo", "ACI", "Onboarding", "Comunicaciones internas", "Legal laboral", "Compensaciones", "Gestión de talento", "Otros"];

export default function Bandeja() {
  const navigate = useNavigate();
  const [pedidos, setPedidos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch]     = useState("");
  const [filters, setFilters]   = useState({ estado: "", prioridad: "", sede: "", proceso: "" });

  const urlParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    if (urlParams.get("crear") === "true") setFormOpen(true);
    if (urlParams.get("filtro_estado") === "Bloqueado") setFilters(f => ({ ...f, estado: "Bloqueado" }));
    base44.entities.Pedido.list("-created_date").then(d => { setPedidos(d); setLoading(false); });
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const isVencidoFilter = urlParams.get("filtro_estado") === "vencidos";

  const filtered = pedidos.filter(p => {
    if (search && !p.titulo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.solicitante?.toLowerCase().includes(search.toLowerCase()) &&
        !p.responsable?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.estado    && p.estado    !== filters.estado)    return false;
    if (filters.prioridad && p.prioridad !== filters.prioridad) return false;
    if (filters.sede      && p.sede      !== filters.sede)      return false;
    if (filters.proceso   && p.proceso   !== filters.proceso)   return false;
    if (isVencidoFilter && !(p.fecha_requerida < today && p.estado !== "Cerrado")) return false;
    return true;
  });

  const hasFilters = Object.values(filters).some(Boolean) || search || isVencidoFilter;
  const clearFilters = () => {
    setFilters({ estado: "", prioridad: "", sede: "", proceso: "" });
    setSearch("");
    window.history.replaceState({}, "", "/bandeja");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Bandeja de pedidos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{isVencidoFilter ? " vencidos" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-3.5 w-3.5" /> Nuevo pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-xs w-52" />
        </div>
        <Select value={filters.estado}    onValueChange={v => setFilters(f => ({ ...f, estado: v }))}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.prioridad} onValueChange={v => setFilters(f => ({ ...f, prioridad: v }))}>
          <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.sede}      onValueChange={v => setFilters(f => ({ ...f, sede: v }))}>
          <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="Sede" /></SelectTrigger>
          <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.proceso}   onValueChange={v => setFilters(f => ({ ...f, proceso: v }))}>
          <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
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
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Responsable</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Proceso</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Sede</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">Fecha req.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isOverdue = p.fecha_requerida < today && p.estado !== "Cerrado";
              return (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)}
                  className={`border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isOverdue && <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />}
                      <span className="font-medium text-slate-700 truncate max-w-[220px]">{p.titulo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.solicitante}</td>
                  <td className="px-4 py-3 text-slate-500">{p.responsable || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.estado} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={p.prioridad} /></td>
                  <td className="px-4 py-3 text-slate-400">{p.proceso}</td>
                  <td className="px-4 py-3 text-slate-400">{p.sede}</td>
                  <td className={`px-4 py-3 font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>{p.fecha_requerida}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No se encontraron pedidos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PedidoForm open={formOpen} onClose={() => setFormOpen(false)} pedido={null} onSaved={() => base44.entities.Pedido.list("-created_date").then(setPedidos)} />
    </div>
  );
}