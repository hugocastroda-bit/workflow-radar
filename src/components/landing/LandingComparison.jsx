import { Check } from "lucide-react";

const MESSAGES = [
  "Implementación rápida.",
  "Adaptado a cada equipo.",
  "Sin configuraciones innecesarias.",
  "Soporte cercano.",
];

export default function LandingComparison() {
  return (
    <section id="caracteristicas" className="px-4 md:px-6 py-12 md:py-16 max-w-5xl mx-auto text-center">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        Más simple que las herramientas complejas.
      </h2>

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="px-6 py-2.5 rounded-xl gradient-premium text-white text-base font-bold shadow-sm hover:scale-[1.02] transition-transform">
          Workflow Radar
        </span>
      </div>

      <ul className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 max-w-xl mx-auto text-left">
        {MESSAGES.map((msg) => (
          <li key={msg} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>{msg}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}