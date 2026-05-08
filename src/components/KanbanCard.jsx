import { useNavigate } from "react-router-dom";
import PriorityBadge from "./PriorityBadge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export default function KanbanCard({ pedido, provided }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";
  const isClosed = pedido.estado === "Cerrado";

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => navigate(`/pedido/${pedido.id}`)}
      className={`bg-card rounded-lg border p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow ${
        isOverdue ? "border-red-300 bg-red-50/30" :
        isBlocked ? "border-amber-300 bg-amber-50/30" :
        isClosed ? "border-emerald-200 bg-emerald-50/30" :
        "border-border"
      }`}
    >
      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{pedido.titulo}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <PriorityBadge priority={pedido.prioridad} />
        <span className="text-xs text-muted-foreground">{pedido.proceso}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground truncate max-w-[60%]">
          {pedido.responsable || "Sin asignar"}
        </span>
        <div className="flex items-center gap-1">
          {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          {isBlocked && <Clock className="h-3.5 w-3.5 text-amber-500" />}
          {isClosed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {pedido.fecha_requerida}
          </span>
        </div>
      </div>
      {pedido.sede && (
        <p className="text-xs text-muted-foreground mt-1.5 truncate">{pedido.sede}</p>
      )}
    </div>
  );
}