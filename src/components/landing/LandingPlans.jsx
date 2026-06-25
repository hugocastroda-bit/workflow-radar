import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Essential",
    usuarios: "Hasta 5 usuarios",
    precio: "S/ 5.99",
    precioLabel: "por usuario / mes",
    implementacion: "S/ 99",
    incluye: [
      "Bandeja de pedidos",
      "Kanban",
      "Dashboard",
      "Time Box",
      "Configuración básica",
      "Exportación a Excel",
      "5 créditos mensuales para ajustes menores",
      "Soporte por correo",
    ],
    destacado: false,
    boton: "Solicitar demo",
  },
  {
    name: "Team",
    usuarios: "Hasta 10 usuarios",
    precio: "S/ 7.99",
    precioLabel: "por usuario / mes",
    implementacion: "S/ 199",
    subheader: "Incluye todo Essential, además de:",
    incluye: [
      "Carga masiva",
      "Dashboard ejecutivo",
      "Riesgos y SLA",
      "Reportes avanzados",
      "10 créditos mensuales",
      "Soporte prioritario",
    ],
    destacado: false,
    boton: "Solicitar demo",
  },
  {
    name: "Pro",
    usuarios: "Hasta 20 usuarios",
    precio: "S/ 9.99",
    precioLabel: "por usuario / mes",
    implementacion: "S/ 399",
    subheader: "Incluye todo Team, además de:",
    incluye: [
      "Multiempresa",
      "Dashboard de capacidad",
      "KPIs y OKRs",
      "Indicadores ejecutivos",
      "20 créditos mensuales",
      "Atención prioritaria",
    ],
    destacado: true,
    boton: "Solicitar demo",
  },
  {
    name: "Business",
    usuarios: "Más de 20 usuarios",
    precio: null,
    precioLabel: null,
    implementacion: null,
    incluye: [
      "Todo lo del plan Pro",
      "Implementación personalizada",
      "Branding de empresa",
      "Configuración avanzada",
      "Roadmap conjunto",
      "Soporte preferente",
      "Créditos de cambios personalizados",
    ],
    destacado: false,
    boton: "Contactar ventas",
  },
];

const IMPLEMENTACION = [
  "Configuración de la empresa.",
  "Creación de usuarios.",
  "Parametrización inicial.",
  "Capacitación al equipo.",
  "Acompañamiento durante la puesta en marcha.",
];

const PROMOCION = [
  "Obtén un 50% de descuento por lanzamiento.",
  "Accede a un precio preferencial como cliente fundador.",
];

export default function LandingPlans({ onSelectPlan }) {
  return (
    <section id="planes" className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto scroll-mt-16 reveal-up">
      <div className="text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
          Planes Workflow Radar
        </h2>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#E91E63] via-[#FF2D7E] to-[#3DDC97] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
          🚀 Precio Fundador · 50% OFF por lanzamiento
        </div>
        <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
          Empieza con el plan que mejor se adapte a tu equipo.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Todos los planes incluyen implementación guiada, soporte y actualizaciones.
        </p>
      </div>

      <div className="mt-12 md:mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-card border rounded-2xl p-6 flex flex-col relative transition-all duration-300 hover:scale-[1.02] hover:shadow-lg glass-premium ${
              plan.destacado
                ? "border-[#FF2D7E] ring-2 ring-[#FF2D7E]/20 shadow-md glow-subtle"
                : "border-border hover:border-primary/30"
            }`}
          >
            {plan.destacado && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#E91E63] via-[#FF2D7E] to-[#3DDC97] text-white text-[10px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                <Star className="h-2.5 w-2.5 fill-white" /> Más popular
              </span>
            )}
            <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              {plan.name}
              {plan.destacado && <span className="text-amber-400">⭐</span>}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{plan.usuarios}</p>

            <div className="mt-4 mb-3 pb-3 border-b border-border">
              {plan.precio ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.precio}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{plan.precioLabel}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Implementación única: <span className="font-semibold text-foreground">{plan.implementacion}</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">Contáctanos</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Precio personalizado según el tamaño de tu organización.
                  </p>
                </>
              )}
            </div>

            {plan.subheader && (
              <p className="text-[10px] font-medium text-foreground mb-2">{plan.subheader}</p>
            )}

            <ul className="space-y-2 flex-1">
              {plan.incluye.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`mt-6 w-full rounded-[14px] transition-all duration-250 hover:scale-[1.02] ${
                plan.destacado ? "gradient-premium text-white" : ""
              }`}
              variant={plan.destacado ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPlan(plan.name)}
            >
              {plan.boton}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-card border border-border rounded-2xl p-6 md:p-8 glass-premium reveal-up">
        <h3 className="text-lg font-semibold text-foreground text-center">¿Qué incluye la implementación?</h3>
        <ul className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-foreground">
          {IMPLEMENTACION.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 text-center space-y-2 reveal-up">
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#E91E63] via-[#FF2D7E] to-[#3DDC97] text-white text-xs font-semibold px-4 py-1.5 rounded-full animate-shimmer">
          🎉 Precio Fundador
        </div>
        <ul className="text-sm text-muted-foreground max-w-md mx-auto">
          {PROMOCION.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 justify-center mt-1">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}