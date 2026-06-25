import { Inbox, BarChart3, Target, Gauge, FolderKanban, Activity, Clock, Users } from "lucide-react";

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
  return (
    <section className="px-4 md:px-6 py-20 md:py-28 max-w-5xl mx-auto text-center">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
        Un solo lugar para todo.
      </h2>
      <div className="mt-12 md:mt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {FEATURES.map((f) => (
          <div key={f.label} className="bg-card border border-border rounded-2xl p-5 md:p-6 flex flex-col items-center gap-3 transition-colors hover:border-primary/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E91E63]/10 to-[#3DDC97]/10 flex items-center justify-center">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm md:text-base font-medium text-foreground">{f.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}