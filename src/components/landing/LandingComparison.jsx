import { Check } from "lucide-react";

const MESSAGES = [
  "Implementación rápida.",
  "Adaptado a cada equipo.",
  "Sin configuraciones innecesarias.",
  "Soporte cercano.",
];

export default function LandingComparison() {
  return (
    <section id="caracteristicas" className="px-4 md:px-6 py-16 md:py-20 max-w-5xl mx-auto text-center scroll-mt-16">
      <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
        Más simple que las herramientas complejas.
      </h2>

      <div className="mt-8 flex flex-col items-center gap-4">
        <span className="px-8 py-3 rounded-xl brand-gradient text-white text-lg font-bold shadow-sm">
          Workflow Radar
        </span>
      </div>

      <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-xl mx-auto text-left">
        {MESSAGES.map((msg) => (
          <li key={msg} className="flex items-center gap-2.5 text-sm md:text-base text-foreground">
            <Check className="h-5 w-5 text-primary shrink-0" />
            <span>{msg}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}