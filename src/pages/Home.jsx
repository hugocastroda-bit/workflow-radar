import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SummaryCard from "../components/SummaryCard";
import { Inbox, Columns3, BarChart3, Plus, AlertTriangle, Clock, Loader2 } from "lucide-react";

export default function Home() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { base44.entities.Pedido.list().then(d => { setPedidos(d); setLoading(false); }); }, []);

  const today = new Date().toISOString().split("T")[0];
  const abiertos  = pedidos.filter(p => p.estado !== "Cerrado");
  const vencidos  = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = pedidos.filter(p => p.estado === "Bloqueado");
  const cerrados  = pedidos.filter(p => p.estado === "Cerrado");

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Torre de control</p>
        <h1 className="text-xl font-semibold text-slate-800">{"Radar C&T"}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Abiertos"   value={abiertos.length}  variant="info" />
        <SummaryCard title="Vencidos"   value={vencidos.length}  variant="danger" />
        <SummaryCard title="Bloqueados" value={bloqueados.length} variant="warning" />
        <SummaryCard title="Cerrados"   value={cerrados.length}  variant="success" />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { to: "/bandeja?crear=true",              icon: Plus,          label: "Nuevo pedido",         sub: "Registrar solicitud" },
            { to: "/bandeja",                          icon: Inbox,         label: "Bandeja",              sub: "Ver todos los pedidos" },
            { to: "/kanban",                           icon: Columns3,      label: "Kanban",               sub: "Vista por estado" },
            { to: "/bandeja?filtro_estado=vencidos",   icon: AlertTriangle, label: "Pedidos vencidos",     sub: `${vencidos.length} requieren atención` },
            { to: "/bandeja?filtro_estado=Bloqueado",  icon: Clock,         label: "Bloqueados",           sub: `${bloqueados.length} pedidos bloqueados` },
            { to: "/dashboard",                        icon: BarChart3,     label: "Dashboard",            sub: "Carga de trabajo" },
          ].map(({ to, icon: Icon, label, sub }) => (
            <Link key={to} to={to}>
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-3">
                <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}