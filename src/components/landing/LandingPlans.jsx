import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Essential",
    usuarios: "Hasta 5 usuarios",
    precio: "S/ 5.99",
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
  },
  {
    name: "Team",
    usuarios: "Hasta 10 usuarios",
    precio: "S/ 7.99",
    implementacion: "S/ 199",
    incluye: [
      "Carga masiva",
      "Dashboard ejecutivo",
      "Riesgos y SLA",
      "Reportes avanzados",
      "10 créditos mensuales",
      "Soporte prioritario",
    ],
    destacado: false,
  },
  {
    name: "Pro",
    usuarios: "Hasta 20 usuarios",
    precio: "S/ 9.99",
    implementacion: "S/ 399",
    incluye: [
      "Multiempresa",
      "Dashboard de capacidad",
      "KPIs y OKRs",
      "Indicadores ejecutivos",
      "20 créditos mensuales",
      "Atención prioritaria",
    ],
    destacado: true,
  },
  {
    name: "Business",
    usuarios: "Más de 20 usuarios",
    precio: null,
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
  },
];

const IMPLEMENTACION = [
  "Configuración de la empresa.",
  "Creación de usuarios.",
  "Parametrización inicial.",
  "Capacitación al equipo.",
  "Acompañamiento durante la puesta en marcha.",
];

export default function LandingPlans({ onSelectPlan }) {
  return (
    <section id="planes" className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto scroll-mt-16">
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
            className={`bg-card border rounded-2xl p-6 flex flex-col relative ${
              plan.destacado ? "border-[#FF2D7E] ring-2 ring-[#FF2D7E]/20" : "border-border"
            }`}
          >
            {plan.destacado && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#E91E63] via-[#FF2D7E] to-[#3DDC97] text-white text-[10px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                Más popular
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
                    <span className="text-xs text-muted-foreground">/mes</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">por usuario / mes</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Implementación única: <span className="font-semibold text-foreground">{plan.implementacion}</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">Contáctanos</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Precio personalizado según el tamaño de tu organización.</p>
                </>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
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

      <div className="mt-16 max-w-2xl mx-auto text-center">
        <h3 className="text-xl font-bold text-foreground">¿Qué incluye la implementación?</h3>
        <p className="text-sm text-muted-foreground mt-1">La implementación inicial comprende:</p>
        <ul className="mt-4 text-left space-y-2 max-w-md mx-auto">
          {IMPLEMENTACION.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary mt-px shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 text-center bg-gradient-to-r from-[#E91E63]/5 via-[#FF2D7E]/5 to-[#3DDC97]/5 border border-border rounded-2xl p-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          🎉 Precio Fundador
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Obtén un <span className="font-semibold text-foreground">50% de descuento</span> por lanzamiento y accede a un precio preferencial como cliente fundador.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Solicita una demo, pruébalo y compáralo.</p>
      </div>
    </section>
  );
}