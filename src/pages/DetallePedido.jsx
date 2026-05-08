import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import PedidoForm from "../components/PedidoForm";
import { ArrowLeft, Pencil, AlertTriangle, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadPedido();
  }, [id]);

  const loadPedido = async () => {
    const data = await base44.entities.Pedido.get(id);
    setPedido(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-8 text-center text-muted-foreground">Pedido no encontrado</div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";

  const Field = ({ label, value, highlight }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-1 ${highlight ? "text-red-600 font-medium" : "text-foreground"}`}>
        {value || "—"}
      </p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{pedido.titulo}</h1>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle className="h-3 w-3" /> Vencido
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={pedido.estado} />
              <PriorityBadge priority={pedido.prioridad} />
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </div>

      {/* Section 1: General Info */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Información general</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="Solicitante" value={pedido.solicitante} />
          <Field label="Responsable" value={pedido.responsable} />
          <Field label="Sede" value={pedido.sede} />
          <Field label="Proceso" value={pedido.proceso} />
          <Field label="Prioridad" value={pedido.prioridad} />
          <Field label="Estado" value={pedido.estado} />
          <Field label="Fecha requerida" value={pedido.fecha_requerida} highlight={isOverdue} />
          <Field label="Fecha de creación" value={pedido.created_date?.split("T")[0]} />
          <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />
        </div>
        {pedido.descripcion && (
          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descripción</p>
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{pedido.descripcion}</p>
          </div>
        )}
      </div>

      {/* Section 2: Tracking */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Seguimiento</h2>
        <div className="space-y-4">
          <Field label="Próxima acción" value={pedido.proxima_accion} />
          <Field label="Comentarios de avance" value={pedido.comentarios_avance} />
          {pedido.estado === "Bloqueado" && (
            <div className="border-l-4 border-amber-400 pl-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Motivo de bloqueo</p>
              </div>
              <p className="text-sm text-amber-900">{pedido.motivo_bloqueo || "Sin especificar"}</p>
            </div>
          )}
          <Field label="Última actualización" value={pedido.updated_date?.split("T")[0]} />
        </div>
      </div>

      {/* Section 3: Evidence */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Evidencias</h2>
        {pedido.link_evidencia ? (
          <a
            href={pedido.link_evidencia}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {pedido.link_evidencia}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Sin evidencias registradas</p>
        )}
      </div>

      {/* Section 4: Close */}
      {pedido.estado === "Cerrado" && (
        <div className="bg-white border border-emerald-200 rounded-lg p-6">
          <h2 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-4">Cierre</h2>
          <div className="space-y-4">
            <Field label="Resultado final" value={pedido.resultado_final} />
            <Field label="Comentario de cierre" value={pedido.comentario_cierre} />
            <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />
          </div>
        </div>
      )}

      <PedidoForm
        open={editing}
        onClose={() => setEditing(false)}
        pedido={pedido}
        onSaved={loadPedido}
      />
    </div>
  );
}