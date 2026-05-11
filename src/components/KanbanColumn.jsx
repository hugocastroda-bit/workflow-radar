import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ status, pedidos, onDelete, onArchive, onConfidencial }) {
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{status}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{pedidos.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[120px] rounded-lg p-1.5 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : "bg-secondary/30"
            }`}
          >
            {pedidos.map((pedido, index) => (
              <Draggable key={pedido.id} draggableId={pedido.id} index={index}>
                {(provided) => (
                  <KanbanCard
              key={pedido.id} pedido={pedido}
              provided={provided} onDelete={onDelete} onArchive={onArchive} onConfidencial={onConfidencial} />
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