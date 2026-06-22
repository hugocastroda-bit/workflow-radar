import { Check, ArrowDown } from "lucide-react";

const OLD_TOOLS = ["Trello", "ClickUp", "Monday"];
const MESSAGES = [
  "Implementación rápida.",
  "Adaptado a cada equipo.",
  "Sin configuraciones innecesarias.",
  "Soporte cercano.",
];

export default function LandingComparison() {
  return (
    <section className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto text-center">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
        Más simple que herramientas complejas.
      </h2>

      <div className="mt-12 md:mt-16 flex flex-col items-center gap-6">
        {/* Old tools */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {OLD_TOOLS.map((tool) => (
            <span key={tool} className="px-5 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium line-through decoration-muted-foreground/40">
              {tool}
            </span>
          ))}
        </div>

        <ArrowDown className="h-6 w-6 text-muted-foreground/50" />

        {/* Workflow Radar */}
        <span className="px-8 py-3 rounded-xl brand-gradient text-white text-lg font-bold shadow-sm">
          Workflow Radar
        </span>
      </div>

      <ul className="mt-14 md:mt-16 grid sm:grid-cols-2 gap-x-8 gap-y-4 max-w-xl mx-auto text-left">
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