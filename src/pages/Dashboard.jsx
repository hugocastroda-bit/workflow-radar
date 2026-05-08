import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Loader2 } from "lucide-react";
import _ from "lodash";

const DONUT_COLORS = {
  "Nuevo": "#93c5fd",
  "Por priorizar": "#cbd5e1",
  "Asignado": "#a5b4fc",
  "En curso": "#7dd3fc",
  "Bloqueado": "#fcd34d",
  "En revisión": "#c4b5fd",
  "Cerrado": "#6ee7b7",
};

const TT = { fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 4, boxShadow: "none" };

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white border rounded-lg px-5 py-4 ${color || "border-border"}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold mt-1.5 tracking-tight ${
        color === "border-red-200" ? "text-red-600" :
        color === "border-amber-200" ? "text-amber-600" :
        color === "border-emerald-200" ? "text-emerald-700" :
        "text-foreground"
      }`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-slate-50/60">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Pedido.filter({ archivado: false }).then(d => { setPedidos(d); setLoading(false); });
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

  // Charts data
  const byResponsable = Object.entries(_.countBy(abiertos.filter(p => p.responsable), "responsable"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const sinAsignar = abiertos.filter(p => !p.responsable).length;

  const byProceso = Object.entries(_.countBy(pedidos, "proceso"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);



  const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
  const byEstado = ESTADOS.map(name => ({
    name, value: pedidos.filter(p => p.estado === name).length, color: DONUT_COLORS[name]
  })).filter(e => e.value > 0);

  const byPrioridad = ["Alta", "Media", "Baja"].map(pr => ({
    pr, count: pedidos.filter(p => p.prioridad === pr).length,
    bar: pr === "Alta" ? "bg-red-300" : pr === "Media" ? "bg-yellow-300" : "bg-slate-200"
  }));
  const maxPr = Math.max(...byPrioridad.map(p => p.count), 1);

  // Ranking responsable
  const ranking = Object.entries(_.groupBy(pedidos, "responsable"))
    .filter(([k]) => k && k !== "undefined")
    .map(([name, items]) => ({
      name,
      total: items.length,
      activos: items.filter(p => p.estado !== "Cerrado").length,
      vencidos: items.filter(p => p.fecha_requerida < today && p.estado !== "Cerrado").length,
      bloqueados: items.filter(p => p.estado === "Bloqueado").length,
    }))
    .sort((a, b) => b.activos - a.activos);

  const barH = (n) => Math.max(n * 34 + 20, 80);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Torre de control de carga de trabajo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Abiertos" value={abiertos.length} />
        <StatCard label="Vencidos" value={vencidos.length} color="border-red-200" />
        <StatCard label="Bloqueados" value={bloqueados.length} color="border-amber-200" />
        <StatCard label="Cerrados" value={cerrados.length} color="border-emerald-200" />
        <StatCard label="Cerrados / semana" value={cerradosSemana.length} color="border-emerald-200" />
        <StatCard label="Días prom. cierre" value={avgClose !== null ? `${avgClose}d` : "—"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Carga activa por responsable">
          {byResponsable.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={barH(byResponsable.length)}>
                <BarChart data={byResponsable} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" name="Pedidos" fill="hsl(212 52% 28%)" radius={[0, 3, 3, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
              {sinAsignar > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{sinAsignar} pedido{sinAsignar > 1 ? "s" : ""} sin asignar</p>
              )}
            </>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </Section>

        <Section title="Distribución por estado">
          {byEstado.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={byEstado} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                    {byEstado.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {byEstado.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="font-medium tabular-nums">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </Section>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-5">
        <Section title="Pedidos por proceso">
          {byProceso.length > 0 ? (
            <ResponsiveContainer width="100%" height={barH(byProceso.length)}>
              <BarChart data={byProceso} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" name="Pedidos" fill="hsl(152 40% 42%)" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
        </Section>
      </div>

      {/* Prioridad + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Distribución por prioridad">
          <div className="space-y-4">
            {byPrioridad.map(({ pr, count, bar }) => (
              <div key={pr} className="flex items-center gap-3">
                <PriorityBadge priority={pr} />
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.round(count / maxPr * 100)}%` }} />
                </div>
                <span className="text-sm font-medium tabular-nums w-6 text-right text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ranking de carga por responsable">
          {ranking.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 text-xs font-medium text-muted-foreground">Responsable</th>
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Activos</th>
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Vencidos</th>
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Bloqueados</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(r => (
                  <tr key={r.name} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-700 truncate max-w-[140px]">{r.name}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{r.activos}</td>
                    <td className={`py-2 text-right tabular-nums ${r.vencidos > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{r.vencidos}</td>
                    <td className={`py-2 text-right tabular-nums ${r.bloqueados > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>{r.bloqueados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Sin responsables asignados</p>}
        </Section>
      </div>

      {/* Alert tables */}
      {vencidos.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100 bg-red-50/40">
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Pedidos vencidos — {vencidos.length}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Título</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Vence</th>
              </tr>
            </thead>
            <tbody>
              {vencidos.slice(0, 10).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-foreground truncate max-w-[240px]">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.responsable || "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.estado} /></td>
                  <td className="px-4 py-2.5 text-red-600 text-xs font-medium">{p.fecha_requerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bloqueados.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/40">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pedidos bloqueados — {bloqueados.length}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Título</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {bloqueados.slice(0, 10).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-foreground truncate max-w-[220px]">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.responsable || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[200px]">{p.motivo_bloqueo || "Sin especificar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}