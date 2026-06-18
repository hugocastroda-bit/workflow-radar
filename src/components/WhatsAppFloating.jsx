import { MessageCircle } from "lucide-react";

const PHONE = "51998196026";
const MESSAGE = encodeURIComponent("Hola, tengo una consulta sobre Workflow Radar.");

export default function WhatsAppFloating() {
  const waUrl = `https://wa.me/${PHONE}?text=${MESSAGE}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
      aria-label="Contactar por WhatsApp"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
      }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}