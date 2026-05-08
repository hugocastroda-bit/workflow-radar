import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SummaryCard from "../components/SummaryCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Inbox, AlertTriangle, Clock, CheckCircle2, Loader2 } from "lucide-react";
import _ from "lodash";

const PIE_COLORS = ["#3b82f6", "#94a3b8", "#6366f1", "#0ea5e9", "#f59e0b", "#a855f7", "#10b981"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const data = await base44.entities.Pedido.list();
    setPedidos(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const weekStr = thisWeekStart.toISOString().split("T")[0];

  const abiertos = pedidos.filter(p => p.estado !== "Cerrado");
  const cerrados = pedidos.filter(p => p.estado === "Cerrado");
  const vencidos = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = pedidos.filter(p => p.estado === "Bloqueado");
  const cerradosSemana = cerrados.filter(p => p.fecha_cierre_real >= weekStr);

  // Average close time
  const closeTimes = cerrados
    .filter(p => p.fecha_cierre_real && p.created_date)
    .map(p => {
      const created = new Date(p.created_date);
      const closed = new Date(p.fecha_cierre_real);
      return Math.max(0, Math.ceil((closed - created) / (1000 * 60 * 60 * 24)));
    });
  const avgCloseTime = closeTimes.length > 0 ? Math.round(_.mean(closeTimes)) : 0;

  // By responsable
  const byResponsable = Object.entries(_.countBy(abiertos, "responsable"))
    .map(([name, count]) => ({ name: name || "Sin asignar", count }))
    .sort((a, b) => b.count - a.count);

  // By proceso
  const byProceso = Object.entries(_.countBy(pedidos, "proceso"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // By sede
  const bySede = Object.entries(_.countBy(pedidos, "sede"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // By estado
  const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
  const byEstado = ESTADOS.map((name, i) => ({
    name,
    value: pedidos.filter(p => p.estado === name).length,
    color: PIE_COLORS[i],
  })).filter(e => e.value > 0);

  // By prioridad
  const byPrioridad = ["Alta", "Media", "Baja"].map(name => ({
    name,
    count: pedidos.filter(p => p.prioridad === name).length,
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Carga de trabajo del equipo</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard title="Abiertos" value={abiertos.length} icon={Inbox} variant="info" />
        <SummaryCard title="Vencidos" value={vencidos.length} icon={AlertTriangle} variant="danger" />
        <SummaryCard title="Bloqueados" value={bloqueados.length} icon={Clock} variant="warning" />
        <SummaryCard title="Cerrados" value={cerrados.length} icon={CheckCircle2} variant="success" />
        <SummaryCard title="Cerrados esta semana" value={cerradosSemana.length} variant="success" />
        <SummaryCard title="Tiempo prom. cierre" value={`${avgCloseTime}d`} variant="default" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Responsable */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Carga por responsable</h3>
          {byResponsable.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, byResponsable.length * 40)}>
              <BarChart data={byResponsable} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 15% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(212 52% 25%)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* By Estado - Pie */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribución por estado</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byEstado} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {byEstado.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {byEstado.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                {e.name} ({e.value})
              </div>
            ))}
          </div>
        </div>

        {/* By Proceso */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pedidos por proceso</h3>
          {byProceso.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, byProceso.length * 36)}>
              <BarChart data={byProceso} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 15% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(160 45% 45%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* By Sede */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pedidos por sede</h3>
          {bySede.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, bySede.length * 36)}>
              <BarChart data={bySede} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 15% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(35 85% 55%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>
      </div>

      {/* Priority breakdown */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Pedidos por prioridad</h3>
        <div className="grid grid-cols-3 gap-4">
          {byPrioridad.map(p => (
            <div key={p.name} className="text-center">
              <p className="text-3xl font-semibold text-foreground">{p.count}</p>
              <PriorityBadge priority={p.name} />
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Table */}
      {vencidos.length > 0 && (
        <div className="bg-card border border-red-200 rounded-xl p-6 bg-red-50/20">
          <h3 className="text-sm font-semibold text-red-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Pedidos vencidos ({vencidos.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-red-600">Título</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-red-600">Responsable</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-red-600">Estado</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-red-600">Fecha req.</th>
                </tr>
              </thead>
              <tbody>
                {vencidos.slice(0, 10).map(p => (
                  <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-red-100 last:border-0 cursor-pointer hover:bg-red-50">
                    <td className="py-2 px-3 font-medium">{p.titulo}</td>
                    <td className="py-2 px-3 text-muted-foreground">{p.responsable || "—"}</td>
                    <td className="py-2 px-3"><StatusBadge status={p.estado} /></td>
                    <td className="py-2 px-3 text-red-600">{p.fecha_requerida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blocked Table */}
      {bloqueados.length > 0 && (
        <div className="bg-card border border-amber-200 rounded-xl p-6 bg-amber-50/20">
          <h3 className="text-sm font-semibold text-amber-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pedidos bloqueados ({bloqueados.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-amber-600">Título</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-amber-600">Responsable</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-amber-600">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {bloqueados.slice(0, 10).map(p => (
                  <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-amber-100 last:border-0 cursor-pointer hover:bg-amber-50">
                    <td className="py-2 px-3 font-medium">{p.titulo}</td>
                    <td className="py-2 px-3 text-muted-foreground">{p.responsable || "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{p.motivo_bloqueo || "Sin especificar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}