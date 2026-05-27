import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ status, pedidos, onDelete, onArchive, onConfidencial, accentColor, backgroundColor }) {
  return (
    <div className="flex-shrink-0 w-64 flex flex-col" style={{ maxHeight: "calc(100dvh - 160px)" }}>
      <div className="flex items-center justify-between mb-3 px-1 pb-2 border-b-2 no-select" style={{ borderColor: accentColor }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>{status}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{pedidos.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="min-h-[120px] flex-1 overflow-y-auto rounded-lg p-1.5 transition-colors drag-zone dark:!bg-[#0D0F1A]"
            style={{
              backgroundColor: snapshot.isDraggingOver ? accentColor + "08" : backgroundColor
            }}
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