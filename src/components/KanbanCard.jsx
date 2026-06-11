import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Trash2, Archive, Lock, LockOpen, GripVertical, AlertCircle, Clock } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import ConfidencialBadge from "./ConfidencialBadge";

function formatFecha(fechaStr) {
  if (!fechaStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaStr + "T00:00:00");
  const diff = Math.round((fecha - today) / 86400000);

  if (diff < 0)  return { label: `Venció hace ${Math.abs(diff)}d`, overdue: true };
  if (diff === 0) return { label: "Vence hoy", overdue: true };
  if (diff === 1) return { label: "Vence mañana", overdue: false, warn: true };
  if (diff <= 3)  return { label: `Vence en ${diff}d`, overdue: false, warn: true };
  return { label: `${diff}d`, overdue: false };
}

function Iniciales({ nombre }) {
  if (!nombre) return null;
  const partes = nombre.trim().split(/\s+/);
  const iniciales = partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();

  // Color determinista basado en el nombre
  const colors = [
    ["#E0F2FE","#0369A1"], ["#DCF7E3","#15803D"], ["#FEF3C7","#B45309"],
    ["#F3E8FF","#7C3AED"], ["#FFE4E6","#BE123C"], ["#ECFDF5","#047857"],
  ];
  const idx = nombre.charCodeAt(0) % colors.length;
  const [bg, fg] = colors[idx];

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0"
      style={{ backgroundColor: bg, color: fg }}
      title={nombre}
    >
      {iniciales}
    </span>
  );
}

export default function KanbanCard({ pedido, provided, isDragging, onDelete, onArchive, onConfidencial }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida && pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";

  const ESTADOS_CONGELADOS = ["Nuevo", "Por priorizar"];
  const diasEstancado = Math.floor(
    (Date.now() - new Date(pedido.updated_date || pedido.created_date)) / 86400000
  );
  const isAging = ESTADOS_CONGELADOS.includes(pedido.estado) && diasEstancado >= 7;

  const fechaInfo = formatFecha(pedido.fecha_requerida);

  const borderClass = isOverdue
    ? "border-l-[3px] border-l-alert"
    : isBlocked
    ? "border-l-[3px] border-l-warning"
    : "border-border";

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      onClick={() => navigate(`/pedido/${pedido.id}`)}
      className={`
        group bg-card rounded-lg border cursor-pointer mb-2 no-select drag-zone
        transition-all duration-150
        ${borderClass}
        ${isDragging
          ? "shadow-lg ring-1 ring-primary/30 rotate-[0.5deg] scale-[1.02]"
          : "hover:shadow-md hover:border-border/80"
        }
      `}
    >
      {/* Drag handle */}
      <div
        {...provided.dragHandleProps}
        onClick={e => e.stopPropagation()}
        className="flex items-center justify-center w-full py-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar tarjeta"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      <div className="px-3 pb-3">
        {/* Title row */}
        <div className="flex items-start gap-1.5 mb-2">
          <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 flex-1">
            {pedido.titulo}
          </p>
          {pedido.confidencial && <ConfidencialBadge size="xs" />}
        </div>

        {/* Proceso chip */}
        {pedido.proceso && (
          <span className="inline-block text-[10px] text-muted-foreground bg-secondary/80 dark:bg-muted/40 px-1.5 py-0.5 rounded mb-2 truncate max-w-full">
            {pedido.proceso}
          </span>
        )}

        {/* Priority + Fecha */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <PriorityBadge priority={pedido.prioridad} />
          {fechaInfo && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${
              fechaInfo.overdue ? "text-alert" : fechaInfo.warn ? "text-warning" : "text-muted-foreground"
            }`}>
              {(fechaInfo.overdue || fechaInfo.warn) && <Clock className="h-2.5 w-2.5" />}
              {fechaInfo.label}
            </span>
          )}
        </div>

        {/* Responsable + solicitante */}
        <div className="flex items-center justify-between mt-2.5 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {pedido.responsable ? (
              <>
                <Iniciales nombre={pedido.responsable} />
                <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                  {pedido.responsable.split(" ")[0]}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground/60 italic">Sin asignar</span>
            )}
          </div>
          {pedido.solicitante && (
            <span className="text-[10px] text-muted-foreground/70 truncate max-w-[80px]" title={pedido.solicitante}>
              {pedido.solicitante}
            </span>
          )}
        </div>

        {/* Aging warning */}
        {isAging && (
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded border
            bg-warning/10 text-warning border-warning/30
            dark:bg-[#331B00] dark:text-[#FF9F00] dark:border-[#5C3200]">
            <AlertCircle className="h-2.5 w-2.5" />
            {diasEstancado}d sin gestión
          </span>
        )}

        {/* Admin actions — hidden by default, visible on hover */}
        {isAdmin && (onDelete || onArchive || onConfidencial) && (
          <div className="flex justify-end mt-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onConfidencial && (
              <button
                onClick={e => { e.stopPropagation(); onConfidencial({ id: pedido.id, marcar: !pedido.confidencial }); }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label={pedido.confidencial ? "Quitar confidencialidad" : "Marcar como confidencial"}
                title={pedido.confidencial ? "Quitar confidencialidad" : "Marcar como confidencial"}
              >
                {pedido.confidencial ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </button>
            )}
            {onArchive && (
              <button
                onClick={e => { e.stopPropagation(); onArchive(pedido); }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Archivar pedido"
                title="Archivar"
              >
                <Archive className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(pedido); }}
                className="p-1 rounded text-muted-foreground hover:text-alert hover:bg-alert/10 transition-colors"
                aria-label="Borrar pedido"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}