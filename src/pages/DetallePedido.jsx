import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import PedidoForm from "../components/PedidoForm";
import { ArrowLeft, Pencil, ExternalLink, Loader2 } from "lucide-react";

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const data = await base44.entities.Pedido.get(id);
    setPedido(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;
  if (!pedido)  return <div className="p-8 text-sm text-slate-400">Pedido no encontrado</div>;

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";

  const Field = ({ label, value, highlight }) => (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? "text-red-600 font-medium" : "text-slate-700"}`}>{value || "—"}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="mt-0.5 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h1 className="text-lg font-semibold text-slate-800">{pedido.titulo}</h1>
              {isOverdue && <span className="text-xs text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Vencido</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={pedido.estado} />
              <PriorityBadge priority={pedido.prioridad} />
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5 shrink-0">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      {/* Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Información general</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="Solicitante"     value={pedido.solicitante} />
          <Field label="Responsable"     value={pedido.responsable} />
          <Field label="Sede"            value={pedido.sede} />
          <Field label="Proceso"         value={pedido.proceso} />
          <Field label="Fecha requerida" value={pedido.fecha_requerida} highlight={isOverdue} />
          <Field label="Fecha creación"  value={pedido.created_date?.split("T")[0]} />
        </div>
        {pedido.descripcion && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Descripción</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{pedido.descripcion}</p>
          </div>
        )}
      </div>

      {/* Seguimiento */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Seguimiento</p>
        <Field label="Próxima acción"        value={pedido.proxima_accion} />
        <Field label="Comentarios de avance" value={pedido.comentarios_avance} />
        {pedido.motivo_bloqueo && (
          <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
            <p className="text-xs font-semibold text-amber-600 mb-1">Motivo de bloqueo</p>
            <p className="text-sm text-amber-800">{pedido.motivo_bloqueo}</p>
          </div>
        )}
        {pedido.link_evidencia && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Evidencia</p>
            <a href={pedido.link_evidencia} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> {pedido.link_evidencia}
            </a>
          </div>
        )}
      </div>

      {/* Cierre */}
      {pedido.estado === "Cerrado" && (
        <div className="bg-white border border-emerald-100 rounded-lg p-6 space-y-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Cierre</p>
          <Field label="Resultado final"       value={pedido.resultado_final} />
          <Field label="Comentario de cierre"  value={pedido.comentario_cierre} />
          <Field label="Fecha real de cierre"  value={pedido.fecha_cierre_real} />
        </div>
      )}

      <PedidoForm open={editing} onClose={() => setEditing(false)} pedido={pedido} onSaved={load} />
    </div>
  );
}