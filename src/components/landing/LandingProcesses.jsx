import { HeartPulse, Settings, ShieldCheck, FolderKanban, Layers } from "lucide-react";

const AREAS = [
  { label: "Recursos Humanos", icon: HeartPulse },
  { label: "Operaciones", icon: Settings },
  { label: "Calidad", icon: ShieldCheck },
  { label: "Proyectos", icon: FolderKanban },
  { label: "Cualquier equipo", icon: Layers },
];

export default function LandingProcesses() {
  return (
    <section className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto text-center">
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
        Tus procesos.
        <br />
        <span className="brand-gradient-text">Tu forma de trabajar.</span>
      </h2>
      <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
        Workflow Radar se adapta a Recursos Humanos, Operaciones, Calidad, Proyectos o cualquier equipo.
      </p>
      <div className="mt-12 md:mt-16 flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {AREAS.map((a) => (
          <div key={a.label} className="flex items-center gap-2.5 bg-card border border-border rounded-full px-5 py-2.5">
            <a.icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}