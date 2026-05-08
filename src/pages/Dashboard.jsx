import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import _ from "lodash";

const DONUT_COLORS = {
  "Nuevo": "#60a5fa",
  "Por priorizar": "#94a3b8",
  "Asignado": "#818cf8",
  "En curso": "#38bdf8",
  "Bloqueado": "#fbbf24",
  "En revisión": "#a78bfa",
  "Cerrado": "#34d399",
};

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 4,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  padding: "6px 10px",
};

function StatCard({ label, value, variant = "default" }) {
  const colors = {
    default: "text-foreground",
    danger: "text-red-600",
    warning: "text-amber-600",
    success: "text-emerald-700",
  };
  const borders = {
    default: "border-border",
    danger: "border-red-200",
    warning: "border-amber-200",
    success: "border-emerald-200",
  };
  return (
    <div className={`bg-white border ${borders[variant]} rounded-lg px-5 py-4`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold mt-1.5 tracking-tight ${colors[variant]}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children, hint }) {
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AlertTable({ title, borderColor, headerColor, rows, emptyText }) {
  return (
    <div className={`bg-white border ${borderColor} rounded-lg overflow-hidden`}>
      <div className={`px-5 py-3 border-b ${borderColor}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${headerColor}`}>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>{rows}</tbody>
        </table>
      )}
    </div>
  );
}

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
  const cerradosSemana = cerrados.filter(p => p.fecha_cierre_real >= weekStr);

  const closeTimes = cerrados
    .filter(p => p.fecha_cierre_real && p.created_date)
    .map(p => Math.max(0, Math.ceil((new Date(p.fecha_cierre_real) - new Date(p.created_date)) / 86400000)));
  const avgClose = closeTimes.length ? Math.round(_.mean(closeTimes)) : null;

  // Chart data
  const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
  const byEstado = ESTADOS
    .map(name => ({ name, value: pedidos.filter(p => p.estado === name).length, color: DONUT_COLORS[name] }))
    .filter(e => e.value > 0);

  const byResponsable = Object.entries(_.countBy(abiertos, "responsable"))
    .map(([name, count]) => ({ name: name === "undefined" || !name ? "Sin asignar" : name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const byProceso = Object.entries(_.countBy(pedidos, "proceso"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const bySede = Object.entries(_.countBy(pedidos, "sede"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const prioridades = ["Alta", "Media", "Baja"].map(pr => ({
    pr,
    count: pedidos.filter(p => p.prioridad === pr).length,
    pct: pedidos.length ? Math.round(pedidos.filter(p => p.prioridad === pr).length / pedidos.length * 100) : 0,
  }));

  // Ranking: active load per responsable
  const activosPorResponsable = Object.entries(_.countBy(abiertos.filter(p => p.responsable), "responsable"))
    .map(([name, count]) => ({
      name,
      count,
      vencidos: vencidos.filter(p => p.responsable === name).length,
      bloqueados: bloqueados.filter(p => p.responsable === name).length,
    }))
    .sort((a, b) => b.count - a.count);

  const prColorBar = { "Alta": "#f87171", "Media": "#fbbf24", "Baja": "#cbd5e1" };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Torre de control — carga de trabajo del equipo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Abiertos" value={abiertos.length} />
        <StatCard label="Vencidos" value={vencidos.length} variant="danger" />
        <StatCard label="Bloqueados" value={bloqueados.length} variant="warning" />
        <StatCard label="Cerrados" value={cerrados.length} variant="success" />
        <StatCard label="Cerrados esta semana" value={cerradosSemana.length} variant="success" />
        <StatCard label="Prom. días cierre" value={avgClose !== null ? `${avgClose}d` : "—"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* By responsable (wide) */}
        <div className="lg:col-span-3">
          <ChartCard title="Carga activa por responsable" hint="pedidos abiertos">
            {byResponsable.length > 0 ? (
              <ResponsiveContainer width="100%" height={byResponsable.length * 36 + 16}>
                <BarChart data={byResponsable} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(v) => [v, "Pedidos"]} />
                  <Bar dataKey="count" fill="hsl(212 52% 28%)" radius={[0, 3, 3, 0]} barSize={18} label={{ position: "right", fontSize: 11, fill: "#94a3b8" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
          </ChartCard>
        </div>

        {/* By estado donut */}
        <div className="lg:col-span-2">
          <ChartCard title="Distribución por estado">
            {byEstado.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {byEstado.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {byEstado.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="truncate">{e.name}</span>
                      <span className="ml-auto font-medium text-foreground">{e.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
          </ChartCard>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Pedidos por proceso">
          {byProceso.length > 0 ? (
            <ResponsiveContainer width="100%" height={byProceso.length * 34 + 16}>
              <BarChart data={byProceso} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(v) => [v, "Pedidos"]} />
                <Bar dataKey="count" fill="hsl(152 40% 42%)" radius={[0, 3, 3, 0]} barSize={16} label={{ position: "right", fontSize: 11, fill: "#94a3b8" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </ChartCard>

        <div className="space-y-5">
          {/* By sede */}
          <ChartCard title="Pedidos por sede">
            {bySede.length > 0 ? (
              <div className="space-y-2">
                {bySede.map(s => (
                  <div key={s.name} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-600 flex-1 truncate text-xs">{s.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${Math.round(s.count / pedidos.length * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-5 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
          </ChartCard>

          {/* By prioridad */}
          <ChartCard title="Pedidos por prioridad">
            <div className="space-y-3">
              {prioridades.map(({ pr, count, pct }) => (
                <div key={pr} className="flex items-center gap-3">
                  <PriorityBadge priority={pr} />
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: prColorBar[pr] }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Ranking carga */}
      {activosPorResponsable.length > 0 && (
        <ChartCard title="Ranking de carga por responsable">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="text-right py-2 text-xs font-medium text-muted-foreground">Activos</th>
                <th className="text-right py-2 text-xs font-medium text-red-400">Vencidos</th>
                <th className="text-right py-2 text-xs font-medium text-amber-500">Bloqueados</th>
              </tr>
            </thead>
            <tbody>
              {activosPorResponsable.map(r => (
                <tr key={r.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 font-medium text-foreground">{r.name}</td>
                  <td className="py-2 text-right tabular-nums text-foreground">{r.count}</td>
                  <td className={`py-2 text-right tabular-nums ${r.vencidos > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{r.vencidos}</td>
                  <td className={`py-2 text-right tabular-nums ${r.bloqueados > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>{r.bloqueados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      )}

      {/* Alert tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AlertTable
          title={`Pedidos vencidos (${vencidos.length})`}
          borderColor="border-red-200"
          headerColor="text-red-700"
          emptyText="Sin pedidos vencidos"
          rows={vencidos.slice(0, 8).map(p => (
            <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-red-50/40">
              <td className="px-5 py-2.5 font-medium text-foreground text-xs">{p.titulo}</td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{p.responsable || "—"}</td>
              <td className="px-3 py-2.5 text-red-600 text-xs whitespace-nowrap">{p.fecha_requerida}</td>
            </tr>
          ))}
        />

        <AlertTable
          title={`Pedidos bloqueados (${bloqueados.length})`}
          borderColor="border-amber-200"
          headerColor="text-amber-700"
          emptyText="Sin pedidos bloqueados"
          rows={bloqueados.slice(0, 8).map(p => (
            <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-amber-50/40">
              <td className="px-5 py-2.5 font-medium text-foreground text-xs">{p.titulo}</td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{p.responsable || "—"}</td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs">{p.motivo_bloqueo || "Sin especificar"}</td>
            </tr>
          ))}
        />
      </div>
    </div>
  );
}