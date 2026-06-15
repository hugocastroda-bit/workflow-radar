import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Loader2, Filter, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import _ from "lodash";
import { useAuth } from "@/lib/AuthContext";
import { filtrarConfidenciales } from "@/lib/confidencial";
import PullToRefresh from "@/components/PullToRefresh";

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

const CAPACIDAD_MENSUAL_MINUTOS = 240 * 5 * 4; // 240 min/día × 5 días/sem × 4 sem = 4800 min/mes

const ESTADOS_ACTIVOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión"];
const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

function calcAvgClose(cerrados) {
  const times = cerrados
    .filter(p => p.fecha_cierre_real && p.created_date)
    .map(p => (new Date(p.fecha_cierre_real) - new Date(p.created_date.split("T")[0])) / 86400000)
    .filter(d => d >= 0);
  if (!times.length) return null;
  return parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1));
}

function StatCard({ label, value, color, subtitle }) {
  return (
    <div className={`bg-card border rounded-lg px-5 py-4 ${color || "border-border"}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold mt-1.5 tracking-tight ${
        color === "border-alert/30" ? "text-alert" :
        color === "border-warning/30" ? "text-warning" :
        color === "border-success/30" ? "text-success" :
        "text-foreground"
      }`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-card border rounded-lg overflow-hidden ${accent || "border-border"}`}>
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
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Dashboard filters
  const [fResponsable, setFResponsable] = useState("");
  const [fProceso, setFProceso] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fPrioridad, setFPrioridad] = useState("");
  const [fTimeBox, setFTimeBox] = useState("");
  const [fFechaReqDesde, setFFechaReqDesde] = useState("");
  const [fFechaReqHasta, setFFechaReqHasta] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.filter({ archivado: false }).catch(() => []),
      base44.entities.Responsable.list().catch(() => []),
    ]).then(([pedidosData, responsablesData]) => {
      setPedidos(filtrarConfidenciales(pedidosData, user));
      setResponsables(responsablesData);
      const map = {};
      responsablesData.forEach(r => { map[r.nombre] = { activo: r.activo, capacidad: r.capacidadSemanalHoras ?? 40 }; });
      setResponsablesMap(map);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = async () => {
    const [pedidosData, responsablesData] = await Promise.all([
      base44.entities.Pedido.filter({ archivado: false }).catch(() => []),
      base44.entities.Responsable.list().catch(() => []),
    ]);
    setPedidos(filtrarConfidenciales(pedidosData, user));
    setResponsables(responsablesData);
    const map = {};
    responsablesData.forEach(r => { map[r.nombre] = { activo: r.activo, capacidad: r.capacidadSemanalHoras ?? 40 }; });
    setResponsablesMap(map);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split("T")[0];

  const extractNombre = (str) => {
    if (!str) return "";
    let clean = str.split(/\s*—\s*/)[0].split(/@/)[0].trim();
    return clean;
  };

  // Apply dashboard filters to pedidos
  const filteredPedidos = pedidos.filter(p => {
    if (fResponsable && extractNombre(p.responsable || "") !== fResponsable) return false;
    if (fProceso && p.proceso !== fProceso) return false;
    if (fEstado && p.estado !== fEstado) return false;
    if (fPrioridad && p.prioridad !== fPrioridad) return false;
    if (fTimeBox === "dentro" && (p.horasEstimadas == null || (p.horasReales != null && p.horasEstimadas > 0 && p.horasReales > p.horasEstimadas))) return false;
    if (fTimeBox === "fuera" && (p.horasEstimadas == null || !(p.horasReales != null && p.horasEstimadas > 0 && p.horasReales > p.horasEstimadas))) return false;
    if (fFechaReqDesde && (!p.fecha_requerida || p.fecha_requerida < fFechaReqDesde)) return false;
    if (fFechaReqHasta && (!p.fecha_requerida || p.fecha_requerida > fFechaReqHasta)) return false;
    return true;
  });

  const abiertos = filteredPedidos.filter(p => p.estado !== "Cerrado");
  const cerrados = filteredPedidos.filter(p => p.estado === "Cerrado");
  const vencidos = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = filteredPedidos.filter(p => p.estado === "Bloqueado");
  const cerradosSemana = cerrados.filter(p => p.fecha_cierre_real >= weekStr);
  const avgClose = calcAvgClose(cerrados);

  // Time Boxing metrics
  const conEstimacion = abiertos.filter(p => p.horasEstimadas != null);
  const conEstimacionReal = conEstimacion.filter(p => p.horasReales != null && p.horasEstimadas > 0);
  const fueraDeTimeBox = conEstimacionReal.filter(p => p.horasReales > p.horasEstimadas);
  const dentroDeTimeBox = conEstimacionReal.filter(p => p.horasReales <= p.horasEstimadas);
  const precisionEstimacion = conEstimacionReal.length > 0
    ? Math.round(dentroDeTimeBox.length / conEstimacionReal.length * 100)
    : null;

  const horasEstimadasTotal = conEstimacion.reduce((sum, p) => sum + (parseFloat(p.horasEstimadas) || 0), 0);
  const horasRealesTotal = conEstimacion.reduce((sum, p) => sum + (parseFloat(p.horasReales) || 0), 0);
  const desviacionHoras = horasRealesTotal - horasEstimadasTotal;

  // Responsables sobre capacidad
  const responsablesSobrecapacidad = [];
  const cargaHorasMap = {};
  abiertos.forEach(p => {
    if (!p.responsable) return;
    const resp = extractNombre(p.responsable);
    if (!cargaHorasMap[resp]) {
      cargaHorasMap[resp] = { responsable: resp, horasEstimadas: 0, horasReales: 0, pedidos: 0, vencidos: 0, bloqueados: 0, capacidad: CAPACIDAD_MENSUAL_MINUTOS };
    }
    cargaHorasMap[resp].horasEstimadas += parseFloat(p.horasEstimadas) || 0;
    cargaHorasMap[resp].horasReales += parseFloat(p.horasReales) || 0;
    cargaHorasMap[resp].pedidos++;
    if (p.fecha_requerida && p.fecha_requerida < today) cargaHorasMap[resp].vencidos++;
    if (p.estado === "Bloqueado") cargaHorasMap[resp].bloqueados++;
  });
  const cargaHorasData = Object.values(cargaHorasMap).sort((a, b) => b.horasEstimadas - a.horasEstimadas);

  cargaHorasData.forEach(item => {
    const pct = item.capacidad > 0 ? Math.round(item.horasEstimadas / item.capacidad * 100) : 0;
    if (pct > 100) responsablesSobrecapacidad.push(item);
  });

  // Exclude "Sin asignar" from charts; keep it for tables
  const byResponsable = Object.values(
    abiertos.filter(p => p.responsable).reduce((acc, p) => {
      const name = extractNombre(p.responsable);
      if (!acc[name]) acc[name] = { displayName: name, count: 0 };
      acc[name].count++;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 10);

  const sinAsignar = abiertos.filter(p => !p.responsable).length;

  const byProceso = Object.entries(_.countBy(filteredPedidos, "proceso"))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const horasPorProceso = Object.entries(
    conEstimacion.reduce((acc, p) => {
      const proc = p.proceso || "Sin proceso";
      acc[proc] = (acc[proc] || 0) + (parseFloat(p.horasEstimadas) || 0);
      return acc;
    }, {})
  ).map(([name, horas]) => ({ name, horas })).sort((a, b) => b.horas - a.horas).slice(0, 10);

  // Desviación por responsable
  const desviacionPorResponsable = Object.values(
    conEstimacionReal.reduce((acc, p) => {
      if (!p.responsable) return acc;
      const resp = extractNombre(p.responsable);
      if (!acc[resp]) acc[resp] = { responsable: resp, horasEstimadas: 0, horasReales: 0 };
      acc[resp].horasEstimadas += parseFloat(p.horasEstimadas) || 0;
      acc[resp].horasReales += parseFloat(p.horasReales) || 0;
      return acc;
    }, {})
  )
    .map(r => ({ ...r, desviacion: r.horasReales - r.horasEstimadas }))
    .sort((a, b) => b.desviacion - a.desviacion);

  const byEstado = ESTADOS.map(name => ({
    name, value: filteredPedidos.filter(p => p.estado === name).length, color: DONUT_COLORS[name]
  })).filter(e => e.value > 0);

  const byPrioridad = ["Alta", "Media", "Baja"].map(pr => ({
    pr, count: filteredPedidos.filter(p => p.prioridad === pr).length,
    bar: pr === "Alta" ? "bg-red-300" : pr === "Media" ? "bg-yellow-300" : "bg-slate-200"
  }));
  const maxPr = Math.max(...byPrioridad.map(p => p.count), 1);

  // Ranking
  const rankingRawMap = {};
  filteredPedidos.forEach(p => {
    const rawResponsable = p.responsable?.trim() || null;
    const nombreBase = rawResponsable ? extractNombre(rawResponsable) : null;
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

  const ranking = Object.values(
    Object.values(rankingRawMap).reduce((acc, r) => {
      if (acc[r.name]) {
        acc[r.name].activos += r.activos;
        acc[r.name].cerrados += r.cerrados;
        acc[r.name].vencidos += r.vencidos;
        acc[r.name].bloqueados += r.bloqueados;
      } else {
        acc[r.name] = { ...r };
      }
      return acc;
    }, {})
  ).sort((a, b) => b.activos - a.activos || b.cerrados - a.cerrados);

  const barH = (n) => Math.max(n * 34 + 20, 80);

  // Carga de trabajo semanal
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const cargaPorResponsable = {};
  filteredPedidos.forEach(p => {
    const resp = p.responsable ? extractNombre(p.responsable) : "⚠️ Sin asignar";
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

  // Unique values for filters
  const uniq = (arr, key) => {
    const seen = new Set();
    const result = [];
    arr.forEach(item => {
      const val = key ? item[key] : item;
      if (!val || seen.has(val)) return;
      seen.add(val);
      result.push(val);
    });
    return result.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  };

  const respUniq = uniq(pedidos.filter(p => p.responsable).map(p => extractNombre(p.responsable)));
  const procUniq = uniq(pedidos, "proceso");

  const hasFilters = fResponsable || fProceso || fEstado || fPrioridad || fTimeBox || fFechaReqDesde || fFechaReqHasta;
  const clearFilters = () => {
    setFResponsable(""); setFProceso(""); setFEstado(""); setFPrioridad("");
    setFTimeBox(""); setFFechaReqDesde(""); setFFechaReqHasta("");
  };

  // Pedidos fuera de Time Box (for dedicated table)
  const fueraTimeBoxDetalle = conEstimacionReal
    .filter(p => p.horasReales > p.horasEstimadas)
    .map(p => ({
      ...p,
      _resp: extractNombre(p.responsable || ""),
      _desviacion: p.horasReales - p.horasEstimadas,
    }))
    .sort((a, b) => b._desviacion - a._desviacion);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">Torre de control de carga y capacidad</p>
      </div>

      {/* Dashboard Filters */}
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap gap-3 items-center">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={fResponsable || "__placeholder__"} onValueChange={v => setFResponsable(v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {respUniq.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fProceso || "__placeholder__"} onValueChange={v => setFProceso(v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {procUniq.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fEstado || "__placeholder__"} onValueChange={v => setFEstado(v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            {ESTADOS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fPrioridad || "__placeholder__"} onValueChange={v => setFPrioridad(v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todas</SelectItem>
            {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fTimeBox || "__placeholder__"} onValueChange={v => setFTimeBox(v === "__placeholder__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="Time Box" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" className="text-xs text-muted-foreground">Todos</SelectItem>
            <SelectItem value="dentro" className="text-xs">Dentro del Time Box</SelectItem>
            <SelectItem value="fuera" className="text-xs">Fuera del Time Box</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-border mx-1" />
        <Input type="date" value={fFechaReqDesde} onChange={e => setFFechaReqDesde(e.target.value)} className="h-8 text-xs w-[130px]" placeholder="Fecha desde" />
        <Input type="date" value={fFechaReqHasta} onChange={e => setFFechaReqHasta(e.target.value)} className="h-8 text-xs w-[130px]" placeholder="Fecha hasta" />
        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors whitespace-nowrap">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Pedidos activos" value={abiertos.length} />
        <StatCard label="Vencidos" value={vencidos.length} color="border-alert/30" />
        <StatCard label="Bloqueados" value={bloqueados.length} color="border-warning/30" />
        <StatCard label="Cerrados" value={cerrados.length} color="border-success/30" />
        <StatCard label="Cerrados / semana" value={cerradosSemana.length} color="border-success/30" />
        <StatCard label="Fuera de Time Box" value={fueraDeTimeBox.length} color={fueraDeTimeBox.length > 0 ? "border-alert/30" : "border-success/30"} />
        <StatCard label="Minutos estimados" value={`${horasEstimadasTotal} min`} subtitle={conEstimacion.length > 0 ? `${conEstimacion.length} pedidos` : null} />
        <StatCard label="Minutos reales" value={`${horasRealesTotal} min`} />
        <StatCard label="Desviación min" value={`${desviacionHoras > 0 ? "+" : ""}${desviacionHoras} min`} color={desviacionHoras > 0 ? "border-alert/30" : "border-success/30"} />
        <StatCard
          label="Sobre capacidad"
          value={responsablesSobrecapacidad.length}
          color={responsablesSobrecapacidad.length > 0 ? "border-alert/30" : "border-success/30"}
          subtitle={responsablesSobrecapacidad.length > 0 ? responsablesSobrecapacidad.map(r => r.responsable).join(", ").slice(0, 40) + (responsablesSobrecapacidad.length > 2 ? "…" : "") : null}
        />
        <StatCard label="Precisión est." value={precisionEstimacion !== null ? `${precisionEstimacion}%` : "—"} color={precisionEstimacion !== null && precisionEstimacion >= 70 ? "border-success/30" : precisionEstimacion !== null ? "border-warning/30" : ""} subtitle={precisionEstimacion !== null ? `${dentroDeTimeBox.length} de ${conEstimacionReal.length} dentro` : "Sin datos"} />
        <StatCard label="Días prom. cierre" value={avgClose !== null ? `${avgClose}d` : "—"} color="border-primary/20" />
      </div>

      {/* Carga por responsable (capacity bars) + Distribución por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Carga por responsable (4800 min/mes)">
          {cargaHorasData.length > 0 ? (
            <div className="space-y-3">
              {cargaHorasData.map((item, idx) => {
                const pct = item.capacidad > 0 ? Math.round(item.horasEstimadas / item.capacidad * 100) : 0;
                const barColor = pct > 100 ? "#EF4444" : pct >= 71 ? "#F59E0B" : "#22C55E";
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-foreground w-[100px] truncate" title={item.responsable}>
                      {item.responsable}
                    </span>
                    <div className="flex-1 bg-secondary rounded-full h-2.5 relative overflow-hidden">
                      <div
                        className="h-2.5 rounded-full absolute left-0 top-0 transition-all"
                        style={{ width: `${Math.min(pct, 150)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums w-[75px] text-right" style={{ color: barColor }}>
                      {item.horasEstimadas} min / {item.capacidad} min
                    </span>
                    <span className="text-[10px] font-medium tabular-nums w-[32px] text-right" style={{ color: barColor }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {sinAsignar > 0 && (
                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                  {sinAsignar} pedido{sinAsignar > 1 ? "s" : ""} sin asignar
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Clock className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Aún no hay minutos estimados registrados.</p>
              <p className="text-[10px] text-muted-foreground/60">Agrega minutos estimados en los pedidos para visualizar carga por responsable.</p>
            </div>
          )}
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

      {/* Horas por proceso + Desviación por responsable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Minutos estimados por proceso">
          {horasPorProceso.length > 0 ? (
            <ResponsiveContainer width="100%" height={barH(horasPorProceso.length)}>
              <BarChart data={horasPorProceso} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} cursor={{ fill: "#f8fafc" }} formatter={(value) => [`${value} min`, "Minutos estimados"]} />
                <Bar dataKey="horas" name="Minutos" fill="hsl(217 91% 55%)" radius={[0, 3, 3, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Clock className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Aún no hay minutos estimados registrados por proceso.</p>
            </div>
          )}
        </Section>

        <Section title="Desviación de minutos por responsable">
          {desviacionPorResponsable.length > 0 ? (
            <ResponsiveContainer width="100%" height={barH(desviacionPorResponsable.length)}>
              <BarChart data={desviacionPorResponsable} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="responsable" type="category" width={120} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TT}
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value, name) => {
                    if (name === "horasEstimadas") return [`${value} min`, "Minutos estimados"];
                    if (name === "horasReales") return [`${value} min`, "Minutos reales"];
                    return [`${value > 0 ? "+" : ""}${value} min`, "Desviación"];
                  }}
                />
                <Bar dataKey="horasEstimadas" name="Horas est." fill="hsl(217 91% 55%)" radius={[0, 0, 0, 0]} barSize={10} stackId="a" />
                <Bar dataKey="horasReales" name="Horas reales" fill="hsl(152 40% 42%)" radius={[0, 3, 3, 0]} barSize={10} stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Clock className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Aún no hay minutos reales registrados.</p>
            </div>
          )}
        </Section>
      </div>

      {/* Pedidos fuera de Time Box */}
      {fueraTimeBoxDetalle.length > 0 && (
        <Section title={`Pedidos fuera de Time Box — ${fueraTimeBoxDetalle.length}`} accent="border-alert/30">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Pedido</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Responsable</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Proceso</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Prioridad</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Minutos est.</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Minutos reales</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Desviación</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Fecha req.</th>
                </tr>
              </thead>
              <tbody>
                {fueraTimeBoxDetalle.slice(0, 15).map((p, idx) => (
                  <tr key={idx} onClick={() => navigate(`/pedido/${p.id}`)} className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/30">
                    <td className="px-3 py-2.5 font-medium text-foreground truncate max-w-[160px]">{p.titulo}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p._resp || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.proceso}</td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={p.prioridad} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.estado} /></td>
                    <td className="px-3 py-2.5 text-center">{p.horasEstimadas} min</td>
                    <td className="px-3 py-2.5 text-center font-medium text-alert">{p.horasReales} min</td>
                    <td className="px-3 py-2.5 text-center font-medium text-alert">+{p._desviacion} min</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.fecha_requerida || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Responsables sobre capacidad */}
      {responsablesSobrecapacidad.length > 0 && (
        <Section title={`Responsables sobre capacidad — ${responsablesSobrecapacidad.length}`} accent="border-alert/30">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Responsable</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Min. asignados</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Cap. mensual</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Utilización</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Pedidos activos</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Vencidos</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Bloqueados</th>
                </tr>
              </thead>
              <tbody>
                {responsablesSobrecapacidad.sort((a, b) => {
                  const pa = a.capacidad > 0 ? a.horasEstimadas / a.capacidad : 0;
                  const pb = b.capacidad > 0 ? b.horasEstimadas / b.capacidad : 0;
                  return pb - pa;
                }).map((item, idx) => {
                  const pct = item.capacidad > 0 ? Math.round(item.horasEstimadas / item.capacidad * 100) : 0;
                  return (
                    <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{item.responsable}</td>
                      <td className="px-4 py-2.5 text-center font-medium text-alert">{item.horasEstimadas} min</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{item.capacidad} min</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-alert/10 text-alert font-medium text-xs">{pct}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{item.pedidos}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{item.vencidos}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{item.bloqueados}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

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
                  <th className="text-left py-1.5 text-xs font-medium text-muted-foreground" style={{ minWidth: 180 }}>Responsable</th>
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
                    <td className="py-2 text-foreground" style={{ minWidth: 180, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
    </PullToRefresh>
  );
}