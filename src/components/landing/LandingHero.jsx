import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingHero({ onScrollTo }) {
  return (
    <section className="px-4 md:px-6 pt-20 md:pt-28 pb-16 md:pb-24 max-w-5xl mx-auto text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground">
        El seguimiento de trabajo
        <br />
        <span className="brand-gradient-text">que tu equipo sí utilizará.</span>
      </h1>
      <p className="mt-6 text-lg md:text-xl text-muted-foreground font-medium">
        Simple. Flexible. Adaptado a tus procesos.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="rounded-[14px] gap-1.5" onClick={() => onScrollTo("demo")}>
          Solicitar demo <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="rounded-[14px]" onClick={() => onScrollTo("planes")}>
          Ver planes
        </Button>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Precio fundador desde <span className="font-semibold text-foreground">S/39</span> al mes.
      </p>

      {/* Mockup Bandeja + Kanban */}
      <div className="mt-14 md:mt-20 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Browser bar */}
          <div className="bg-secondary/50 px-4 py-2.5 flex items-center gap-2 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-background rounded-md px-3 py-1 text-[11px] text-muted-foreground text-center">
                app.workflowradar.com/bandeja
              </div>
            </div>
          </div>
          {/* Content: Bandeja table + Kanban */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Bandeja */}
            <div className="p-4 md:p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-secondary rounded" />
                <div className="h-6 w-20 bg-primary/10 rounded-full" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <div className={`h-2 w-2 rounded-full ${i === 2 ? "bg-amber-400" : i === 4 ? "bg-red-400" : "bg-emerald-400"}`} />
                    <div className="h-3.5 bg-secondary rounded flex-1" />
                    <div className={`h-5 px-2 rounded-full text-[9px] flex items-center justify-center font-medium ${
                      i === 1 ? "bg-blue-100 text-blue-700" : i === 2 ? "bg-amber-100 text-amber-700" : i === 3 ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {i === 1 ? "Asignado" : i === 2 ? "Bloqueado" : i === 3 ? "En curso" : "Nuevo"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Kanban */}
            <div className="p-4 md:p-5 text-left">
              <div className="h-4 w-20 bg-secondary rounded mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {["Nuevo", "En curso", "Cerrado"].map((col, ci) => (
                  <div key={col} className="bg-secondary/40 rounded-lg p-2 space-y-1.5">
                    <div className="text-[9px] font-semibold text-muted-foreground">{col}</div>
                    {[1, 2].map((r) => (
                      <div key={r} className="bg-card rounded-md border border-border p-1.5 space-y-1">
                        <div className="h-2 bg-secondary rounded w-3/4" />
                        <div className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${ci === 0 ? "bg-blue-400" : ci === 1 ? "bg-emerald-400" : "bg-purple-400"}`} />
                          <div className="h-1.5 w-8 bg-secondary rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}