import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ status, pedidos, onDelete, onArchive, onConfidencial, accentColor, backgroundColor }) {
  return (
    <div className="flex-shrink-0 w-[240px] flex flex-col" style={{ maxHeight: "calc(100dvh - 160px)" }}>
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg no-select"
        style={{ backgroundColor: backgroundColor }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
            {status}
          </h3>
        </div>
        <span
          className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: accentColor + "22", color: accentColor }}
        >
          {pedidos.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="min-h-[120px] flex-1 overflow-y-auto rounded-lg p-1.5 transition-all duration-200 drag-zone"
            style={{
              backgroundColor: snapshot.isDraggingOver
                ? accentColor + "14"
                : backgroundColor + "80",
              outline: snapshot.isDraggingOver ? `2px dashed ${accentColor}55` : "2px solid transparent",
            }}
          >
            {pedidos.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 opacity-40 select-none">
                <div className="w-8 h-8 rounded-lg border-2 border-dashed mb-2" style={{ borderColor: accentColor }} />
                <span className="text-[10px] text-muted-foreground">Arrastra aquí</span>
              </div>
            )}
            {pedidos.map((pedido, index) => (
              <Draggable key={pedido.id} draggableId={pedido.id} index={index}>
                {(provided, snapshot) => (
                  <KanbanCard
                    key={pedido.id}
                    pedido={pedido}
                    provided={provided}
                    isDragging={snapshot.isDragging}
                    onDelete={onDelete}
                    onArchive={onArchive}
                    onConfidencial={onConfidencial}
                  />
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