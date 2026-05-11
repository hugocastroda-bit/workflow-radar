import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Trash2, Archive, Lock, LockOpen } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import ConfidencialBadge from "./ConfidencialBadge";

export default function KanbanCard({ pedido, provided, onDelete, onArchive, onConfidencial }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => navigate(`/pedido/${pedido.id}`)}
      className={`bg-card rounded-lg border cursor-pointer hover:shadow-sm transition-shadow mb-2 px-3 py-2.5 ${
        isOverdue ? "border-l-4 border-l-alert border-t-border border-r-border border-b-border" :
        isBlocked ? "border-l-4 border-l-warning border-t-border border-r-border border-b-border" :
        "border-border"
      }`}
    >
      <div className="flex items-start gap-1.5 mb-1">
        <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 flex-1">{pedido.titulo}</p>
        {pedido.confidencial && <ConfidencialBadge size="xs" />}
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <PriorityBadge priority={pedido.prioridad} />
        <span className={`text-xs ${isOverdue ? "text-alert font-medium" : "text-muted-foreground"}`}>
         {pedido.fecha_requerida}
        </span>
      </div>
      {pedido.responsable && (
        <p className="text-xs text-muted-foreground mt-1.5 truncate">{pedido.responsable}</p>
      )}
      {isAdmin && (onDelete || onArchive || onConfidencial) && (
        <div className="flex justify-end mt-1.5 gap-1">
          {onConfidencial && (
            <button
              onClick={e => { e.stopPropagation(); onConfidencial({ id: pedido.id, marcar: !pedido.confidencial }); }}
              className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
              title={pedido.confidencial ? "Quitar confidencialidad" : "Marcar confidencial"}
            >
              {pedido.confidencial ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            </button>
          )}
          {onArchive && (
            <button
              onClick={e => { e.stopPropagation(); onArchive(pedido); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Archivar"
            >
              <Archive className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(pedido); }}
              className="p-0.5 rounded text-muted-foreground hover:text-alert transition-colors"
              title="Borrar"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}