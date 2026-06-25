import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowRight } from "lucide-react";

export default function LandingDemo({
  form, formSent, formLoading, formError,
  onFormChange, onSubmit,
}) {
  return (
    <section id="demo" className="px-4 md:px-6 py-12 md:py-16 max-w-3xl mx-auto text-center scroll-mt-16 reveal-up">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
        Pruébalo.
        <br />
        <span className="gradient-premium-text">Compáralo.</span>
      </h2>
      <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
        La mejor forma de conocer Workflow Radar es utilizándolo.
      </p>

      {formSent ? (
        <div className="mt-8 bg-card border border-border rounded-2xl p-6 max-w-md mx-auto animate-scale-in">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">¡Gracias!</h3>
          <p className="text-sm text-muted-foreground mt-1">Te contactaremos para coordinar tu demo.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 bg-card border border-border rounded-2xl p-5 md:p-6 max-w-md mx-auto text-left space-y-3.5 shadow-apple hover:shadow-lg transition-shadow">
          {form.plan && (
            <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-lg text-center">
              Plan seleccionado: {form.plan}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => onFormChange("nombre", e.target.value)} placeholder="Tu nombre" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Empresa</Label>
              <Input value={form.empresa} onChange={(e) => onFormChange("empresa", e.target.value)} placeholder="Tu empresa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Correo corporativo *</Label>
              <Input type="email" value={form.email} onChange={(e) => onFormChange("email", e.target.value)} placeholder="tu@empresa.com" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => onFormChange("telefono", e.target.value)} placeholder="+51 999 999 999" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Mensaje</Label>
            <Textarea value={form.mensaje} onChange={(e) => onFormChange("mensaje", e.target.value)} placeholder="Cuéntanos sobre tu equipo..." className="mt-1" rows={3} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={formLoading} className="w-full rounded-[14px] gap-1.5 gradient-premium hover:opacity-90 transition-opacity">
            {formLoading ? "Enviando..." : (<>Solicitar demo <ArrowRight className="h-4 w-4" /></>)}
          </Button>
        </form>
      )}
    </section>
  );
}