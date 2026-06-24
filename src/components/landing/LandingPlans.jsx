import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Essential",
    usuarios: "Hasta 5 usuarios",
    precio: "S/39",
    porUsuario: "S/7.80 por usuario",
    incluye: ["Bandeja de pedidos", "Kanban", "Dashboard básico", "Catálogos", "Archivados", "5 créditos mensuales"],
    destacado: false,
  },
  {
    name: "Team",
    usuarios: "Hasta 10 usuarios",
    precio: "S/74",
    porUsuario: "S/7.40 por usuario",
    incluye: ["Todo Essential", "Time Box en minutos", "Riesgos y SLA", "Exportación Excel", "Carga masiva", "10 créditos mensuales"],
    destacado: false,
  },
  {
    name: "Pro",
    usuarios: "Hasta 20 usuarios",
    precio: "S/124",
    porUsuario: "S/6.20 por usuario",
    incluye: ["Todo Team", "Dashboard ejecutivo", "Carga por responsable", "Reportes ejecutivos", "Soporte prioritario", "20 créditos mensuales"],
    destacado: true,
  },
  {
    name: "Business",
    usuarios: "Más de 20 usuarios",
    precio: "S/199",
    porUsuario: "Según cantidad de usuarios",
    incluye: ["Todo Pro", "Branding de empresa", "Configuración avanzada", "Reportes personalizados", "Acompañamiento mensual", "40 créditos mensuales"],
    destacado: false,
  },
];

export default function LandingPlans({ onSelectPlan }) {
  return (
    <section id="planes" className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto text-center scroll-mt-16">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
        Planes simples.
      </h2>
      <div className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
        🎉 50% OFF lanzamiento · Precio fundador
      </div>

      <div className="mt-12 md:mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-card border rounded-2xl p-6 flex flex-col relative ${
              plan.destacado ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/20" : "border-border"
            }`}
          >
            {plan.destacado && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white text-[10px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                Más popular
              </span>
            )}
            <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              {plan.name}
              {plan.destacado && <span className="text-amber-400">⭐</span>}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{plan.usuarios}</p>
            <div className="mt-4 mb-4 pb-4 border-b border-border">
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">Desde</span>
                <span className="text-3xl font-bold text-foreground">{plan.precio}</span>
                <span className="text-xs text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{plan.porUsuario}</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.incluye.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary mt-px shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.destacado ? "default" : "outline"}
              size="sm"
              className="w-full rounded-[12px]"
              onClick={() => onSelectPlan(plan.name)}
            >
              {plan.name === "Business" ? "Contactar ventas" : "Solicitar demo"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}