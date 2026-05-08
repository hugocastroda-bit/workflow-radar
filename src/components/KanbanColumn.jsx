import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

const columnColors = {
  "Nuevo": "bg-blue-500",
  "Por priorizar": "bg-slate-400",
  "Asignado": "bg-indigo-500",
  "En curso": "bg-sky-500",
  "Bloqueado": "bg-amber-500",
  "En revisión": "bg-purple-500",
  "Cerrado": "bg-emerald-500",
};

export default function KanbanColumn({ status, pedidos }) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`h-2 w-2 rounded-full ${columnColors[status] || "bg-muted"}`} />
        <h3 className="text-sm font-semibold text-foreground">{status}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {pedidos.length}
        </span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] rounded-lg p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/40"
            }`}
          >
            {pedidos.map((pedido, index) => (
              <Draggable key={pedido.id} draggableId={pedido.id} index={index}>
                {(provided) => (
                  <KanbanCard pedido={pedido} provided={provided} />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}