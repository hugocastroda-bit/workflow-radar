import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function ComentariosHilo({ pedidoId }) {
  const { user, empresaActiva } = useAuth();
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!pedidoId) return;
    base44.entities.ComentarioPedido
      .filter({ pedido_id: pedidoId }, "created_date")
      .then(data => {
        setComentarios(data);
        setCargando(false);
      });
  }, [pedidoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comentarios]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const nuevo = {
      empresaId: empresaActiva?.empresaId,
      pedido_id: pedidoId,
      contenido: texto.trim(),
      nombre_usuario: user?.full_name || user?.email || "Usuario",
      rol_usuario: user?.role === "admin" ? "admin" : "user",
    };
    const guardado = await base44.entities.ComentarioPedido.create(nuevo);
    setComentarios(prev => [...prev, guardado]);
    setTexto("");
    setEnviando(false);
  };

  const esPropio = (c) => c.created_by === user?.email;

  const formatFecha = (fecha) => {
    try {
      return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es });
    } catch {
      return fecha?.split("T")[0] || "";
    }
  };

  return (
    <div className="flex flex-col gap-0 border border-border rounded-lg overflow-hidden bg-card dark:bg-[#0D0F1A]">
      {/* Hilo de mensajes */}
      <div className="max-h-[300px] overflow-y-auto p-3 space-y-3 flex flex-col">
        {cargando && (
          <p className="text-xs text-muted-foreground text-center py-4">Cargando comentarios…</p>
        )}
        {!cargando && comentarios.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Sin comentarios aún. Sé el primero.</p>
        )}
        <AnimatePresence initial={false}>
          {comentarios.map((c) => {
            const propio = esPropio(c);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col gap-0.5 max-w-[85%] ${propio ? "self-end items-end" : "self-start items-start"}`}
              >
                <p className="text-[11px] text-muted-foreground dark:text-[#7E84A3] px-1">
                  {c.nombre_usuario} • {c.rol_usuario === "admin" ? "Admin" : "User"} · {formatFecha(c.created_date)}
                </p>
                <div className={`
                  px-3 py-2 rounded-xl border text-sm leading-snug
                  ${propio
                    ? "bg-primary/10 border-primary/20 text-foreground dark:bg-[#002244] dark:border-[#00A3FF]/30"
                    : "bg-secondary border-border text-foreground dark:bg-[#121420] dark:border-[#22263F]"
                  }
                `}>
                  {c.contenido}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input de envío */}
      <div className="border-t border-border dark:border-[#22263F] flex items-center gap-2 px-3 py-2 bg-card dark:bg-[#121420]">
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleEnviar()}
          placeholder="Escribe un comentario…"
          disabled={enviando}
          className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
          className="p-1.5 rounded-lg transition-colors text-primary hover:bg-primary/10 disabled:opacity-30 dark:text-[#00A3FF] dark:hover:bg-[#00A3FF]/10"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}