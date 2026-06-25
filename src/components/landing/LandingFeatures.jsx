import { Inbox, BarChart3, Target, Gauge, FolderKanban, Activity, Clock, Users } from "lucide-react";
import { useEffect, useRef } from "react";

const FEATURES = [
  { label: "Solicitudes", icon: Inbox },
  { label: "KPIs", icon: BarChart3 },
  { label: "OKRs", icon: Target },
  { label: "Indicadores", icon: Gauge },
  { label: "Proyectos", icon: FolderKanban },
  { label: "Seguimiento", icon: Activity },
  { label: "Time Box", icon: Clock },
  { label: "Carga de trabajo", icon: Users },
];

export default function LandingFeatures() {
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
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        Todo lo que tu equipo necesita.
      </h2>
      <div className="mt-8 md:mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {FEATURES.map((f, idx) => (
          <div
            key={f.label}
            className="bg-card border border-border rounded-2xl p-4 md:p-5 flex flex-col items-center gap-2.5 transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5]/10 to-[#3DDC97]/10 flex items-center justify-center">
              <f.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-foreground">{f.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}