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
    try {
      const emailAuth = user.email.toLowerCase().trim();
      const emailExacto = user.email; // Email exacto del sistema (como lo usa el RLS)

      // Paso 1: Buscar responsable cuyo correo coincida con el usuario autenticado
      // Usamos list() para que admin vea todos; usuarios normales solo ven los activos por RLS
      let todosResponsables = [];
      try { todosResponsables = await base44.entities.Responsable.list(); } catch { todosResponsables = []; }
      const responsable = todosResponsables.find(
        r => (r.email || "").toLowerCase().trim() === emailAuth
      );

      // Paso 2: Obtener todos los espacios activos
      const todosEspacios = await base44.entities.EspacioEquipo.filter({ estado: "Activo" });

      // Paso 3: Buscar membresías por correo autenticado
      // RLS valida data.correoUsuario === user.email (case-sensitive del sistema)
      // Probamos el email exacto del sistema Y el normalizado para cubrir ambos casos
      const correosABuscar = new Set([emailExacto, emailAuth]);
      if (responsable?.email) {
        correosABuscar.add(responsable.email); // email tal como está guardado en Responsable
        correosABuscar.add((responsable.email || "").toLowerCase().trim());
      }

      let todasMembresias = [];
      for (const correo of correosABuscar) {
        try {
          const memb = await base44.entities.MembresiaEspacio.filter({ correoUsuario: correo });
          todasMembresias = [...todasMembresias, ...memb];
        } catch { /* ignorar errores individuales */ }
      }
      // Deduplicar por id
      const seen = new Set();
      const membresias = todasMembresias.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });

      const activas = membresias.filter(m => m.estado === "Activo");
      const result = activas
        .map(m => ({ membresia: m, espacio: todosEspacios.find(e => e.id === m.espacioId) }))
        .filter(r => r.espacio && r.espacio.estado === "Activo");

      setDiagnostico({
        emailAuth,
        responsableEncontrado: !!responsable,
        responsableId: responsable?.id || null,
        responsableNombre: responsable?.nombre || null,
        responsableCorreo: responsable?.email || null,
        responsableEstado: responsable?.activo === false ? "Inactivo" : (responsable ? "Activo" : null),
        totalMembresias: membresias.length,
        activas: activas.length,
        espaciosEncontrados: result.length,
        detalles: membresias.map(m => {
          const esp = todosEspacios.find(e => e.id === m.espacioId);
          return {
            espacioId: m.espacioId,
            nombreEspacio: esp?.nombreEspacio || "(no encontrado)",
            estadoAcceso: m.estado,
            estadoEspacio: esp?.estado || "(no encontrado)",
            rolEnEspacio: m.rolEnEspacio,
          };
        }),
      });
      setEspacios(result);
    } catch (err) {
      toast.error("No se pudieron cargar los espacios. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
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
              const { responsableEncontrado, totalMembresias, activas, detalles } = diagnostico;
              // Caso 1: No hay responsable con ese correo
              if (!responsableEncontrado) return (
                <>
                  <p className="text-sm font-medium text-slate-600">No existe un responsable registrado con tu correo.</p>
                  <p className="text-xs text-slate-400">Pide al administrador que te registre como responsable con el correo: <span className="font-mono">{diagnostico.emailAuth}</span></p>
                </>
              );
              // Caso 2: Hay responsable pero sin accesos
              if (totalMembresias === 0) return (
                <>
                  <p className="text-sm font-medium text-slate-600">Tu usuario está registrado, pero aún no tiene espacios asignados.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador para que asigne un espacio a tu usuario.</p>
                </>
              );
              // Caso 3: Tiene accesos pero están inactivos
              if (activas === 0 && detalles.some(d => d.estadoAcceso !== "Activo")) return (
                <>
                  <p className="text-sm font-medium text-slate-600">Tienes espacios asignados, pero los accesos están inactivos.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador para activar tu acceso.</p>
                </>
              );
              // Caso 4: Accesos activos pero espacios inactivos
              if (activas > 0 && detalles.some(d => d.estadoAcceso === "Activo" && d.estadoEspacio !== "Activo")) return (
                <>
                  <p className="text-sm font-medium text-slate-600">Tienes espacios asignados, pero actualmente están inactivos.</p>
                  <p className="text-xs text-slate-400">Contacta al administrador para reactivar el espacio.</p>
                </>
              );
              return (
                <>
                  <p className="text-sm font-medium text-slate-600">No se encontraron espacios disponibles.</p>
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
              <div className="px-4 pb-3 space-y-2 text-amber-800">
                <div className="space-y-1">
                  <p><span className="font-medium">Correo autenticado:</span> <span className="font-mono">{diagnostico.emailAuth}</span></p>
                  <p><span className="font-medium">Responsable encontrado:</span> {diagnostico.responsableEncontrado ? "✅ Sí" : "❌ No"}</p>
                  {diagnostico.responsableEncontrado && (
                    <>
                      <p><span className="font-medium">Nombre responsable:</span> {diagnostico.responsableNombre}</p>
                      <p><span className="font-medium">Correo en Responsable:</span> <span className="font-mono">{diagnostico.responsableCorreo}</span></p>
                      <p><span className="font-medium">responsableId:</span> <span className="font-mono text-xs">{diagnostico.responsableId}</span></p>
                      <p><span className="font-medium">Estado responsable:</span> {diagnostico.responsableEstado}</p>
                    </>
                  )}
                  <p><span className="font-medium">Accesos encontrados:</span> {diagnostico.totalMembresias}</p>
                  <p><span className="font-medium">Accesos activos:</span> {diagnostico.activas}</p>
                  <p><span className="font-medium">Espacios visibles:</span> {diagnostico.espaciosEncontrados}</p>
                </div>
                {diagnostico.detalles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">Detalle de accesos:</p>
                    {diagnostico.detalles.map((d, i) => (
                      <div key={i} className="pl-2 border-l-2 border-amber-300 space-y-0.5 py-1">
                        <p><span className="font-medium">Espacio:</span> {d.nombreEspacio}</p>
                        <p><span className="font-medium">espacioId:</span> <span className="font-mono">{d.espacioId}</span></p>
                        <p><span className="font-medium">Estado acceso:</span> {d.estadoAcceso === "Activo" ? "✅" : "❌"} {d.estadoAcceso}</p>
                        <p><span className="font-medium">Estado espacio:</span> {d.estadoEspacio === "Activo" ? "✅" : "❌"} {d.estadoEspacio}</p>
                        <p><span className="font-medium">Rol:</span> {d.rolEnEspacio}</p>
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