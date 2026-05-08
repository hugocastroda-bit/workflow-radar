import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SummaryCard from "../components/SummaryCard";
import { Inbox, Columns3, BarChart3, Plus, AlertTriangle, Clock, CheckCircle2, Loader2 } from "lucide-react";

export default function Home() {
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

  const today = new Date().toISOString().split("T")[0];
  const abiertos = pedidos.filter(p => p.estado !== "Cerrado");
  const vencidos = abiertos.filter(p => p.fecha_requerida < today);
  const bloqueados = pedidos.filter(p => p.estado === "Bloqueado");
  const cerrados = pedidos.filter(p => p.estado === "Cerrado");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{"Radar C&T"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{"Torre de control — Cultura y Talento"}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Pedidos abiertos" value={abiertos.length} icon={Inbox} variant="info" />
        <SummaryCard title="Vencidos" value={vencidos.length} icon={AlertTriangle} variant="danger" />
        <SummaryCard title="Bloqueados" value={bloqueados.length} icon={Clock} variant="warning" />
        <SummaryCard title="Cerrados" value={cerrados.length} icon={CheckCircle2} variant="success" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link to="/bandeja?crear=true">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Nuevo pedido</p>
                <p className="text-xs text-muted-foreground">Registrar un nuevo pedido</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/bandeja">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Bandeja de pedidos</p>
                <p className="text-xs text-muted-foreground">Ver todos los pedidos</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/kanban">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Columns3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Tablero Kanban</p>
                <p className="text-xs text-muted-foreground">Vista por estados</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/bandeja?filtro_estado=vencidos">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-red-600 transition-colors">Pedidos vencidos</p>
                <p className="text-xs text-muted-foreground">{vencidos.length} pedidos requieren atenci&oacute;n</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/bandeja?filtro_estado=Bloqueado">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-amber-600 transition-colors">Pedidos bloqueados</p>
                <p className="text-xs text-muted-foreground">{bloqueados.length} pedidos bloqueados</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/dashboard">
          <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Dashboard</p>
                <p className="text-xs text-muted-foreground">Carga de trabajo del equipo</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}