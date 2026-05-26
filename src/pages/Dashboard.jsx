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
import { useAuth } from "@/lib/AuthContext";
import { filtrarConfidenciales } from "@/lib/confidencial";

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

const ESTADOS_ACTIVOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión"];

// Normaliza tipos numéricos del payload analítico (los conteos pueden venir como string)
function normalizarRanking(rankingData) {
  return (rankingData || []).map(r => ({
    ...r,
    activos:    parseInt(r.activos, 10)    || 0,
    cerrados:   parseInt(r.cerrados, 10)   || 0,
    vencidos:   parseInt(r.vencidos, 10)   || 0,
    bloqueados: parseInt(r.bloqueados, 10) || 0,
  }));
}

function calcAvgClose(cerrados) {
  const times = cerrados
    .filter(p => p.fecha_cierre_real && p.created_date)
    .map(p => (new Date(p.fecha_cierre_real) - new Date(p.created_date.split("T")[0])) / 86400000)
    .filter(d => d >= 0);
  if (!times.length) return null;
  return parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1));
}

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-card border rounded-lg px-5 py-4 ${color || "border-border"}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold mt-1.5 tracking-tight ${
        color === "border-alert/30" ? "text-alert" :
        color === "border-warning/30" ? "text-warning" :
        color === "border-success/30" ? "text-success" :
        "text-foreground"
      }`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-secondary">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [responsablesMap, setResponsablesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.filter({ archivado: false }).catch(() => []),
      base44.entities.Responsable.list().catch(() => []),
    ]).then(([pedidosData, responsablesData]) => {
      setPedidos(filtrarConfidenciales(pedidosData, user));
      const map = {};
      responsablesData.forEach(r => { map[r.nombre] = { activo: r.activo }; });
      setResponsablesMap(map);
    }).finally(() => setLoading(false));
  }, [user]);

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

  // MÉTRICA 1: Tiempo promedio de cierre (safety: days >= 0, 1 decimal, fallback null)
  const avgClose = calcAvgClose(cerrados);

  // Charts data
  // Extrae nombre limpio descartando el sufijo " — email" que agrega el formulario
  const extractNombre = (str) => str?.split(" — ")[0]?.trim() || str || "";

  // Deduplica por nombre base antes de renderizar (consolida micro-variaciones del mismo responsable)
  const responsableCountMap = {};
  abiertos.filter(p => p.responsable).forEach(p => {
    const fullLabel = p.responsable;
    const displayName = extractNombre(fullLabel);
    if (!responsableCountMap[displayName]) {
      responsableCountMap[displayName] = { displayName, fullLabel, count: 0 };
    }
    responsableCountMap[displayName].count++;
  });
  const byResponsable = Object.values(responsableCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

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

  // MÉTRICA 2: Ranking — "⚠️ Sin Asignar" + inactivos etiquetados + ORDER BY activos DESC, cerrados DESC
  const rankingRawMap = {};
  pedidos.forEach(p => {
    const nombreBase = p.responsable?.trim() || null;
    let key;
    if (!nombreBase) {
      key = "⚠️ Sin Asignar";
    } else {
      const esInactivo = responsablesMap[nombreBase]?.activo === false;
      key = esInactivo ? `${nombreBase} (Inactivo)` : nombreBase;
    }
    if (!rankingRawMap[key]) {
      rankingRawMap[key] = { name: key, activos: 0, cerrados: 0, vencidos: 0, bloqueados: 0, sinAsignar: !nombreBase };
    }
    if (ESTADOS_ACTIVOS.includes(p.estado)) {
      rankingRawMap[key].activos++;
      if (p.fecha_requerida && p.fecha_requerida < today) rankingRawMap[key].vencidos++;
      if (p.estado === "Bloqueado") rankingRawMap[key].bloqueados++;
    } else if (p.estado === "Cerrado") {
      rankingRawMap[key].cerrados++;
    }
  });
  const ranking = normalizarRanking(
    Object.values(rankingRawMap).sort((a, b) => b.activos - a.activos || b.cerrados - a.cerrados)
  );

  const barH = (n) => Math.max(n * 34 + 20, 80);

  // Carga de trabajo: cerrados esta semana vs abiertos por responsable
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const cargaPorResponsable = {};
  pedidos.forEach(p => {
    const resp = p.responsable || "Sin asignar";
    if (!cargaPorResponsable[resp]) {
      cargaPorResponsable[resp] = { responsable: resp, cerradosHoy: 0, abiertos: 0 };
    }
    if (p.estado === "Cerrado" && p.updated_date && p.updated_date.split("T")[0] >= weekStartStr) {
      cargaPorResponsable[resp].cerradosHoy++;
    } else if (p.estado !== "Cerrado") {
      cargaPorResponsable[resp].abiertos++;
    }
  });
  const cargaData = Object.values(cargaPorResponsable).sort((a, b) => (b.abiertos + b.cerradosHoy) - (a.abiertos + b.cerradosHoy));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Torre de control de carga de trabajo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Abiertos" value={abiertos.length} />
        <StatCard label="Vencidos" value={vencidos.length} color="border-alert/30" />
        <StatCard label="Bloqueados" value={bloqueados.length} color="border-warning/30" />
        <StatCard label="Cerrados" value={cerrados.length} color="border-success/30" />
        <StatCard label="Cerrados / semana" value={cerradosSemana.length} color="border-success/30" />
        <StatCard label="Días prom. cierre" value={avgClose !== null ? `${avgClose}d` : "—"} color="border-primary/20" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Carga activa por responsable">
          {byResponsable.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={byResponsable.length * 42 + 16}>
                <BarChart
                  data={byResponsable}
                  layout="vertical"
                  margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="displayName"
                    type="category"
                    width={148}
                    axisLine={false}
                    tickLine={false}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const raw = payload.value || "";
                      const label = raw.length > 22 ? raw.slice(0, 20) + "…" : raw;
                      return (
                        <text x={x} y={y} dy={4} textAnchor="end" fill="#475569" fontSize={12} fontFamily="var(--font-inter)">
                          {label}
                        </text>
                      );
                    }}
                  />
                  <Tooltip
                    contentStyle={TT}
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(value, _name, props) => [value, "Pedidos activos"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullLabel || item?.displayName || label;
                    }}
                  />
                  <Bar dataKey="count" name="Pedidos" fill="hsl(217 91% 40%)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              {sinAsignar > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {sinAsignar} pedido{sinAsignar > 1 ? "s" : ""} sin asignar
                </p>
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
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
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
                <div className="flex-1 bg-secondary rounded-full h-2">
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
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Cerrados</th>
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Vencidos</th>
                  <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Bloqueados</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(r => (
                  <tr key={r.name} className={`border-b border-border last:border-0 ${
                    r.sinAsignar ? "bg-warning/5" : r.name.includes("(Inactivo)") ? "bg-muted/40" : ""
                  }`}>
                    <td className="py-2 text-foreground truncate max-w-[120px]">
                      {r.sinAsignar
                        ? <span className="text-warning font-medium">{r.name}</span>
                        : r.name.includes("(Inactivo)")
                          ? <span className="text-muted-foreground">{r.name}</span>
                          : r.name
                      }
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{r.activos}</td>
                    <td className="py-2 text-right tabular-nums text-success font-medium">{r.cerrados}</td>
                    <td className={`py-2 text-right tabular-nums ${r.vencidos > 0 ? "text-alert font-medium" : "text-muted-foreground"}`}>{r.vencidos}</td>
                    <td className={`py-2 text-right tabular-nums ${r.bloqueados > 0 ? "text-warning font-medium" : "text-muted-foreground"}`}>{r.bloqueados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Sin responsables asignados</p>}
        </Section>
      </div>

      {/* Carga de trabajo: Cerrados semana vs Abiertos */}
      <Section title="Carga de trabajo — Cerrados (semana) vs Abiertos">
        {cargaData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Responsable</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Cerrados (semana)</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Abiertos</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Total activos</th>
                </tr>
              </thead>
              <tbody>
                {cargaData.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.responsable}</td>
                    <td className="px-4 py-2.5 text-center"><span className="inline-block px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">{item.cerradosHoy}</span></td>
                    <td className="px-4 py-2.5 text-center"><span className={`inline-block px-2.5 py-1 rounded-full font-medium ${
                      item.abiertos > 5 ? "bg-alert/10 text-alert" :
                      item.abiertos > 2 ? "bg-warning/10 text-warning" :
                      "bg-muted text-foreground"
                    }`}>{item.abiertos}</span></td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground font-medium">{item.abiertos + item.cerradosHoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">Sin datos</p>}
      </Section>

      {/* Alert tables */}
      {vencidos.length > 0 && (
        <div className="bg-card border border-alert/30 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-alert/20 bg-alert/10">
            <h3 className="text-xs font-semibold text-alert uppercase tracking-wider">Pedidos vencidos — {vencidos.length}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Título</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Vence</th>
              </tr>
            </thead>
            <tbody>
              {vencidos.slice(0, 10).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-border last:border-0 cursor-pointer hover:bg-secondary/40">
                  <td className="px-5 py-2.5 font-medium text-foreground truncate max-w-[240px]">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.responsable || "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.estado} /></td>
                  <td className="px-4 py-2.5 text-alert text-xs font-medium">{p.fecha_requerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bloqueados.length > 0 && (
        <div className="bg-card border border-warning/30 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-warning/20 bg-warning/10">
            <h3 className="text-xs font-semibold text-warning uppercase tracking-wider">Pedidos bloqueados — {bloqueados.length}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Título</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Responsable</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {bloqueados.slice(0, 10).map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-border last:border-0 cursor-pointer hover:bg-secondary/40">
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