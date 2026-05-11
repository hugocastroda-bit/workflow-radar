import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio, isAdminGlobal } from "@/lib/EspacioContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, ArrowRight, LogOut, LogIn, Settings, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ROL_LABELS = {
  "Owner Espacio": "Propietario",
  "Admin Espacio": "Administrador",
  "User Espacio": "Usuario",
  "Solo lectura": "Solo lectura",
};

export default function SeleccionEspacio() {
  const { user } = useAuth();
  const { entrarEspacio } = useEspacio();
  const navigate = useNavigate();
  const isAdminGeneral = isAdminGlobal(user);
  const [loading, setLoading] = useState(true);
  const [espacios, setEspacios] = useState([]);
  const [diagnostico, setDiagnostico] = useState(null);
  const [showDiag, setShowDiag] = useState(false);
  const [claveModal, setClaveModal] = useState(null);
  const [clave, setClave] = useState("");
  const [validando, setValidando] = useState(false);
  const [claveError, setClaveError] = useState("");

  const cargarEspacios = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const emailNorm = user.email.toLowerCase().trim();

    const [membresias, todosEspacios] = await Promise.all([
      base44.entities.MembresiaEspacio.filter({ correoUsuario: emailNorm }),
      base44.entities.EspacioEquipo.filter({ estado: "Activo" }),
    ]);

    const activas = membresias.filter(m => m.estado === "Activo");
    const result = activas
      .map(m => ({ membresia: m, espacio: todosEspacios.find(e => e.id === m.espacioId) }))
      .filter(r => r.espacio);

    // Diagnóstico
    setDiagnostico({
      emailNorm,
      totalMembresias: membresias.length,
      activas: activas.length,
      espaciosEncontrados: result.length,
      detalles: membresias.map(m => ({
        espacioId: m.espacioId,
        espacio: todosEspacios.find(e => e.id === m.espacioId),
        estado: m.estado,
      })),
    });

    setEspacios(result);
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { cargarEspacios(); }, [cargarEspacios]);

  const handleEntrar = (espacio, membresia) => {
    if (espacio.requiereClave && !membresia.validadoConClave) {
      setClave("");
      setClaveError("");
      setClaveModal({ espacio, membresia });
    } else {
      entrarEspacio(espacio, membresia);
    }
  };

  const handleValidarClave = async () => {
    if (!clave.trim()) return;
    setValidando(true);
    setClaveError("");
    try {
      const res = await base44.functions.invoke("validarClaveEspacio", {
        espacioId: claveModal.espacio.id,
        clave: clave.trim(),
      });
      if (res.data?.valido) {
        await base44.entities.MembresiaEspacio.update(claveModal.membresia.id, {
          validadoConClave: true,
          ultimaValidacionClave: new Date().toISOString(),
        });
        const membresiaActualizada = { ...claveModal.membresia, validadoConClave: true };
        setClaveModal(null);
        entrarEspacio(claveModal.espacio, membresiaActualizada);
      } else {
        setClaveError(res.data?.message || "La clave del espacio no es correcta.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al validar la clave.";
      setClaveError(msg);
    }
    setValidando(false);
  };

  const closeClaveModal = () => { setClaveModal(null); setClave(""); setClaveError(""); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Radar C{"&"}T</p>
          <h1 className="text-2xl font-semibold text-slate-800">Seleccionar espacio</h1>
          <p className="text-sm text-slate-400">
            Bienvenido, {user?.full_name || user?.email}. Elige un espacio para continuar.
          </p>
        </div>

        {/* Spaces */}
        {/* Botón actualizar */}
        <div className="flex justify-end">
          <button
            onClick={cargarEspacios}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar espacios
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : espacios.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            {(() => {
              if (!diagnostico) return null;
              const { totalMembresias, activas, detalles } = diagnostico;
              const tieneInactivas = detalles.some(d => d.estado !== "Activo");
              const tieneEspaciosInactivos = detalles.some(d => d.estado === "Activo" && !d.espacio);
              if (totalMembresias === 0) return (
                <>
                  <p className="text-sm font-medium text-slate-600">No tienes espacios asignados.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador para que registre tu correo como responsable y te asigne a un espacio.</p>
                </>
              );
              if (activas === 0 && tieneInactivas) return (
                <>
                  <p className="text-sm font-medium text-slate-600">Tienes espacios asignados, pero actualmente están inactivos.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador para activar tu acceso.</p>
                </>
              );
              return (
                <>
                  <p className="text-sm font-medium text-slate-600">Tu usuario está registrado, pero aún no tiene espacios activos asignados.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador.</p>
                </>
              );
            })()}
            {isAdminGeneral && (
              <Button onClick={() => navigate("/configuracion")} className="mt-2 gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                <Settings className="h-4 w-4" /> Ir a Configuración de responsables
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {espacios.map(({ espacio, membresia }) => (
              <div key={espacio.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{espacio.nombreEspacio}</p>
                    {espacio.requiereClave && !membresia.validadoConClave && (
                      <Lock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  {espacio.descripcion && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{espacio.descripcion}</p>
                  )}
                  <span className="inline-block mt-1.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {ROL_LABELS[membresia.rolEnEspacio] || membresia.rolEnEspacio}
                  </span>
                </div>
                <Button size="sm" onClick={() => handleEntrar(espacio, membresia)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0">
                  Entrar <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Admin link */}
        {isAdminGeneral && espacios.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/configuracion")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Configuración de responsables
            </button>
          </div>
        )}

        {/* Diagnóstico solo para admin */}
        {isAdminGeneral && diagnostico && (
          <div className="border border-amber-200 rounded-lg bg-amber-50 text-xs">
            <button
              onClick={() => setShowDiag(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-amber-700 font-medium"
            >
              <span>🔍 Diagnóstico de acceso (solo visible para admin)</span>
              {showDiag ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showDiag && (
              <div className="px-4 pb-3 space-y-1 text-amber-800">
                <p><span className="font-medium">Correo autenticado:</span> {diagnostico.emailNorm}</p>
                <p><span className="font-medium">Total accesos registrados:</span> {diagnostico.totalMembresias}</p>
                <p><span className="font-medium">Accesos activos:</span> {diagnostico.activas}</p>
                <p><span className="font-medium">Espacios mostrados:</span> {diagnostico.espaciosEncontrados}</p>
                {diagnostico.detalles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">Detalle de accesos:</p>
                    {diagnostico.detalles.map((d, i) => (
                      <div key={i} className="pl-2 border-l-2 border-amber-300">
                        <p>Espacio: {d.espacio?.nombreEspacio || d.espacioId} — Estado acceso: {d.estado} — Espacio activo: {d.espacio ? "Sí" : "No encontrado"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </div>

      {/* Key validation modal */}
      <Dialog open={!!claveModal} onOpenChange={closeClaveModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-4 w-4 text-slate-500" />
              Ingresar clave del espacio
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            El espacio <span className="font-medium text-slate-700">"{claveModal?.espacio?.nombreEspacio}"</span> requiere una clave de acceso.
          </p>
          <Input
            type="password"
            placeholder="Clave del espacio"
            value={clave}
            onChange={e => { setClave(e.target.value); setClaveError(""); }}
            onKeyDown={e => e.key === "Enter" && handleValidarClave()}
            className="mt-1"
            autoFocus
          />
          {claveError && (
            <p className="text-xs text-red-600 mt-1">{claveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={closeClaveModal} disabled={validando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleValidarClave} disabled={validando || !clave.trim()} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
              {validando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
              {validando ? "Verificando…" : "Ingresar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}