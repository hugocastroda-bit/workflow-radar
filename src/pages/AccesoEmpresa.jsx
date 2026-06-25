import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccesoEmpresa() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresa, setEmpresa] = useState(null);
  const [setupRequested, setSetupRequested] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmpresaId = empresaId.trim().toLowerCase();
  const isInitialSetupCompany = normalizedEmpresaId === "designlab1";
  const loginUrl = empresa ? `/login?empresaId=${encodeURIComponent(empresa.empresaId)}` : "";
  const setupUrl = "/login?next=/owner";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmpresaId = empresaId.trim();
    setEmpresa(null);
    setSetupRequested(false);
    setError("");

    if (!cleanEmpresaId) {
      setError("Ingresa el ID de tu empresa.");
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke("validateEmpresaAccess", {
        empresaId: cleanEmpresaId,
      });
      const data = result?.data || result;

      if (!data?.valid) {
        if (isInitialSetupCompany) {
          setSetupRequested(true);
          setError("DesignLab1 todavía no existe o aún no está disponible. Ingresa para crearla como empresa Owner.");
          return;
        }
        setError(data?.reason === "disabled" ? "La empresa existe pero no está activa." : "No encontramos una empresa activa con ese ID.");
        return;
      }

      setEmpresa(data);
    } catch (err) {
      if (isInitialSetupCompany) {
        setSetupRequested(true);
        setError("No pudimos validar DesignLab1. Puedes continuar al setup Owner para crearla o terminar de configurarla.");
        return;
      }
      setError(err.message || "No pudimos validar la empresa. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Acceso empresa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresa el ID de tu empresa para continuar.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Empresa ID</Label>
              <Input
                value={empresaId}
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  setEmpresa(null);
                  setSetupRequested(false);
                  setError("");
                }}
                placeholder="empresa_..."
                className="mt-1 rounded-xl"
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {empresa && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                Empresa validada: {empresa.nombre}
              </div>
            )}

            {setupRequested && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                Primero debes crear DesignLab1 desde el setup Owner.
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-[14px]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Validando...
                </>
              ) : (
                <>
                  Validar empresa <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {isInitialSetupCompany && !empresa && !setupRequested && (
            <Button variant="outline" className="w-full rounded-[14px]" asChild>
              <a href={setupUrl} target="_blank" rel="noreferrer">
                Ir al setup Owner
              </a>
            </Button>
          )}

          {empresa && (
            <Button variant="outline" className="w-full rounded-[14px]" asChild>
              <a href={loginUrl} target="_blank" rel="noreferrer">
                Abrir login
              </a>
            </Button>
          )}

          {setupRequested && (
            <Button variant="outline" className="w-full rounded-[14px]" asChild>
              <a href={setupUrl} target="_blank" rel="noreferrer">
                Crear DesignLab1
              </a>
            </Button>
          )}

          <div className="text-center">
            <Link to="/" className="text-xs text-primary hover:underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
