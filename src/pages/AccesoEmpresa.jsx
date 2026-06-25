import { Link } from "react-router-dom";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccesoEmpresa() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Acceso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresa con tu usuario. Luego podrás seleccionar o crear tu empresa.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm">
          <Button className="w-full rounded-[14px]" asChild>
            <Link to="/login">
              Iniciar sesión <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button variant="outline" className="w-full rounded-[14px]" asChild>
            <Link to="/login?next=/owner">
              <ShieldCheck className="h-4 w-4" /> Crear DesignLab1
            </Link>
          </Button>

          <div className="text-center pt-2">
            <Link to="/" className="text-xs text-primary hover:underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}