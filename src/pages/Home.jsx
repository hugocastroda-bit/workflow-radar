import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SummaryCard from "../components/SummaryCard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Pedido.list().then(d => { setPedidos(d); setLoading(false); });
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const abiertos = pedidos.filter(p => p.estado !== "Cerrado");
  const vencidos = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = pedidos.filter(p => p.estado === "Bloqueado");
  const cerrados = pedidos.filter(p => p.estado === "Cerrado");

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const quickLinks = [
    { to: "/bandeja", label: "Bandeja de pedidos", desc: `${abiertos.length} pedidos abiertos` },
    { to: "/kanban", label: "Tablero Kanban", desc: "Vista por estado" },
    { to: "/dashboard", label: "Dashboard", desc: "Carga del equipo" },
    { to: "/bandeja?filtro_estado=vencidos", label: "Pedidos vencidos", desc: `${vencidos.length} requieren atención`, alert: vencidos.length > 0 },
    { to: "/bandeja?filtro_estado=Bloqueado", label: "Pedidos bloqueados", desc: `${bloqueados.length} bloqueados`, alert: bloqueados.length > 0 },
    { to: "/bandeja?crear=true", label: "Nuevo pedido", desc: "Registrar solicitud" },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{"Radar C&T"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Torre de control — Cultura y Talento</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Abiertos" value={abiertos.length} variant="default" />
        <SummaryCard title="Vencidos" value={vencidos.length} variant="danger" />
        <SummaryCard title="Bloqueados" value={bloqueados.length} variant="warning" />
        <SummaryCard title="Cerrados" value={cerrados.length} variant="success" />
      </div>

      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {quickLinks.map(item => (
            <Link key={item.to} to={item.to}>
              <div className={`bg-white border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow ${item.alert ? "border-l-4 border-l-red-400" : "border-border"}`}>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className={`text-xs mt-0.5 ${item.alert ? "text-red-500" : "text-muted-foreground"}`}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}