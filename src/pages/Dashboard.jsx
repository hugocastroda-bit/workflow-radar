import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SummaryCard from "../components/SummaryCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import _ from "lodash";

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Pedido.list().then(d => { setPedidos(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split("T")[0];

  const abiertos = pedidos.filter(p => p.estado !== "Cerrado");
  const cerrados = pedidos.filter(p => p.estado === "Cerrado");
  const vencidos = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = pedidos.filter(p => p.estado === "Bloqueado");

  const closeTimes = cerrados
    .filter(p => p.fecha_cierre_real && p.created_date)
    .map(p => Math.max(0, Math.ceil((new Date(p.fecha_cierre_real) - new Date(p.created_date)) / 86400000)));
  const avgClose = closeTimes.length ? Math.round(_.mean(closeTimes)) : 0;

  const byResponsable = Object.entries(_.countBy(abiertos, "responsable"))
    .map(([name, count]) => ({ name: name || "Sin asignar", count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  const byProceso = Object.entries(_.countBy(pedidos, "proceso"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
  const byEstado = ESTADOS.map(name => ({ name, count: pedidos.filter(p => p.estado === name).length })).filter(e => e.count > 0);

  const tooltipStyle = { fontSize: 12, borderRadius: 4, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  const ChartCard = ({ title, children }) => (
    <div className="bg-white border border-border rounded-lg p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Carga de trabajo del equipo</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard title="Abiertos" value={abiertos.length} />
        <SummaryCard title="Vencidos" value={vencidos.length} variant="danger" />
        <SummaryCard title="Bloqueados" value={bloqueados.length} variant="warning" />
        <SummaryCard title="Cerrados" value={cerrados.length} variant="success" />
        <SummaryCard title="Cerrados / semana" value={cerrados.filter(p => p.fecha_cierre_real >= weekStr).length} variant="success" />
        <SummaryCard title="Días prom. cierre" value={avgClose > 0 ? `${avgClose}d` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Carga por responsable">
          {byResponsable.length > 0 ? (
            <ResponsiveContainer width="100%" height={byResponsable.length * 36 + 20}>
              <BarChart data={byResponsable} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" fill="hsl(213 55% 28%)" radius={[0, 3, 3, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </ChartCard>

        <ChartCard title="Pedidos por estado">
          {byEstado.length > 0 ? (
            <ResponsiveContainer width="100%" height={byEstado.length * 36 + 20}>
              <BarChart data={byEstado} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" fill="#94a3b8" radius={[0, 3, 3, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </ChartCard>

        <ChartCard title="Pedidos por proceso">
          {byProceso.length > 0 ? (
            <ResponsiveContainer width="100%" height={byProceso.length * 34 + 20}>
              <BarChart data={byProceso} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" fill="hsl(152 40% 42%)" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </ChartCard>

        <div className="bg-white border border-border rounded-lg p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Distribución por prioridad</h3>
          <div className="space-y-3">
            {["Alta", "Media", "Baja"].map(pr => {
              const count = pedidos.filter(p => p.prioridad === pr).length;
              const pct = pedidos.length ? Math.round(count / pedidos.length * 100) : 0;
              return (
                <div key={pr} className="flex items-center gap-3">
                  <PriorityBadge priority={pr} />
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${pr === "Alta" ? "bg-red-400" : pr === "Media" ? "bg-yellow-400" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {vencidos.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100">
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Pedidos vencidos ({vencidos.length})</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {vencidos.slice(0, 8).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-foreground">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.responsable || "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.estado} /></td>
                  <td className="px-4 py-2.5 text-red-600 text-xs">{p.fecha_requerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bloqueados.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pedidos bloqueados ({bloqueados.length})</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {bloqueados.slice(0, 8).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-foreground">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.responsable || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.motivo_bloqueo || "Sin especificar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}