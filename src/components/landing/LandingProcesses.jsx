import { HeartPulse, Settings, ShieldCheck, FolderKanban, Layers } from "lucide-react";
import { useEffect, useRef } from "react";

const AREAS = [
  { label: "Recursos Humanos", icon: HeartPulse },
  { label: "Operaciones", icon: Settings },
  { label: "Calidad", icon: ShieldCheck },
  { label: "Proyectos", icon: FolderKanban },
  { label: "Cualquier equipo", icon: Layers },
];

export default function LandingProcesses() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="px-4 md:px-6 py-12 md:py-16 max-w-5xl mx-auto text-center reveal-up">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
        Tus procesos.
        <br />
        <span className="gradient-premium-text">Tu forma de trabajar.</span>
      </h2>
      <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
        Workflow Radar se adapta a Recursos Humanos, Operaciones, Calidad, Proyectos o cualquier equipo.
      </p>
      <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
        {AREAS.map((a, idx) => (
          <div
            key={a.label}
            className="flex items-center gap-2.5 bg-card border border-border rounded-full px-4 py-2 transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:shadow-md"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <a.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs md:text-sm font-medium text-foreground">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}