import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ status, pedidos }) {
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{status}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{pedidos.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[120px] rounded-md p-1.5 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : "bg-slate-50"
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