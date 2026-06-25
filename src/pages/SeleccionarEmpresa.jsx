import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, AlertCircle } from "lucide-react";

const PLAN_LABELS = {
  Basic: "Plan Basic",
  Team: "Plan Team",
  Pro: "Plan Pro",
  Business: "Plan Business",
};

const ESTADO_COLORS = {
  Activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Suspendida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Prueba: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function SeleccionarEmpresa() {
  const { user, setEmpresaActiva, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const requestedEmpresaId = params.get("empresaId")?.trim() || "";
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      const loginUrl = requestedEmpresaId ? `/login?empresaId=${encodeURIComponent(requestedEmpresaId)}` : "/login";
      navigate(loginUrl, { replace: true });
      return;
    }
    if (!user?.id) return;
    loadEmpresas();
  }, [isAuthenticated, requestedEmpresaId, user?.id]);

  const loadEmpresas = async () => {
    try {
      const membresias = await base44.entities.UsuarioEmpresa.filter({
        usuarioId: user.id,
        estado: "Activo",
      });

      if (membresias.length === 0) {
        setEmpresas([]);
        setLoading(false);
        return;
      }

      const empresaIds = [...new Set(membresias.map((m) => m.empresaId))];
      const empresasData = await base44.entities.Empresa.filter({
        id: { $in: empresaIds },
      });

      const merged = membresias.map((m) => {
        const emp = empresasData.find((e) => e.id === m.empresaId);
        return { ...m, empresa: emp };
      });

      if (requestedEmpresaId) {
        const requestedMembership = merged.find((m) => m.empresaId === requestedEmpresaId);
        if (requestedMembership) {
          await selectAndGo(requestedMembership);
          return;
        }
        setAccessError("Tu usuario no tiene acceso activo a la empresa indicada.");
        setEmpresas(merged);
        return;
      }

      // Auto-select if only one company
      if (merged.length === 1) {
        await selectAndGo(merged[0]);
        return;
      }

      setEmpresas(merged);
    } catch (e) {
      console.error("Error loading empresas:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectAndGo = async (membresia) => {
    try {
      await setEmpresaActiva(membresia.empresaId, membresia.rol);
      navigate("/bandeja", { replace: true });
    } catch (e) {
      console.error("Error setting active empresa:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sin empresas asignadas</h2>
          <p className="text-sm text-muted-foreground">
            No tienes ninguna empresa asignada. Puedes crear DesignLab1 como Owner o contactar a un administrador.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="mt-2" onClick={() => navigate("/owner")}>
              Crear DesignLab1
            </Button>
            <Link to="/">
              <Button variant="outline">
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
            Selecciona empresa
          </h1>
          <p className="text-sm text-muted-foreground">
            Elige con qué empresa deseas trabajar
          </p>
        </div>

        {accessError && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {accessError}
          </div>
        )}

        <div className="space-y-3">
          {empresas.map((m) => (
            <div
              key={m.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => selectAndGo(m)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {m.empresa?.nombreEmpresa || "Empresa"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {PLAN_LABELS[m.empresa?.plan] || m.empresa?.plan}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        ESTADO_COLORS[m.empresa?.estado] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.empresa?.estado || "—"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Rol: {m.rol}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0">
                Entrar <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
