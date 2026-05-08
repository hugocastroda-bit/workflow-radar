import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "../components/KanbanColumn";
import { Loader2 } from "lucide-react";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

export default function Kanban() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const data = await base44.entities.Pedido.list("-created_date");
    setPedidos(data);
    setLoading(false);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newEstado = destination.droppableId;
    
    setPedidos(prev =>
      prev.map(p => p.id === draggableId ? { ...p, estado: newEstado } : p)
    );

    const updateData = { estado: newEstado };
    if (newEstado === "Cerrado") {
      updateData.fecha_cierre_real = new Date().toISOString().split("T")[0];
    }
    await base44.entities.Pedido.update(draggableId, updateData);
  };

  const grouped = ESTADOS.reduce((acc, estado) => {
    acc[estado] = pedidos.filter(p => p.estado === estado);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 h-full">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tablero Kanban</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{pedidos.length} pedidos en total</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-6">
          {ESTADOS.map(estado => (
            <KanbanColumn key={estado} status={estado} pedidos={grouped[estado]} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}