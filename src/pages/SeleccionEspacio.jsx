import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio } from "@/lib/EspacioContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, ArrowRight, LogOut, Settings, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SeleccionEspacio() {
  const { user } = useAuth();
  const { entrarEspacio } = useEspacio();
  const navigate = useNavigate();
  const isAdminGeneral = user?.role === "admin";
  const [loading, setLoading] = useState(true);
  const [espacios, setEspacios] = useState([]);
  const [claveModal, setClaveModal] = useState(null);
  const [clave, setClave] = useState("");
  const [validando, setValidando] = useState(false);
  const [claveError, setClaveError] = useState("");

  const cargarEspacios = useCallback(async () => {
    setLoading(true);
    try {
      const todosEspacios = await base44.entities.EspacioEquipo.filter({ estado: "Activo" });
      setEspacios(todosEspacios);
    } catch (err) {
      toast.error("No se pudieron cargar los espacios. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarEspacios(); }, [cargarEspacios]);

  const handleEntrar = (espacio) => {
    if (espacio.requiereClave) {
      setClave("");
      setClaveError("");
      setClaveModal({ espacio });
    } else {
      entrarEspacio(espacio);
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
        setClaveModal(null);
        entrarEspacio(claveModal.espacio);
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
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-slate-400">RADAR CT</p>
          <h1 className="text-2xl font-semibold text-slate-800">Seleccionar espacio</h1>
          <p className="text-sm text-slate-400">
            Bienvenido, {user?.full_name || user?.email}. Elige un espacio para continuar.
          </p>
        </div>

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
            <p className="text-sm font-medium text-slate-600">No se encontraron espacios disponibles.</p>
            <p className="text-xs text-slate-400">Contacta al administrador.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {espacios.map((espacio) => (
              <div key={espacio.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{espacio.nombreEspacio}</p>
                    {espacio.requiereClave && (
                      <Lock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  {espacio.descripcion && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{espacio.descripcion}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => handleEntrar(espacio)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0">
                  Entrar <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {isAdminGeneral && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => navigate("/gestion-espacios")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Administración
            </button>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </div>

      <Dialog open={!!claveModal} onOpenChange={closeClaveModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-4 w-4 text-slate-500" />
              Ingresar clave del espacio
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            El espacio <span className="font-medium text-slate-700">"{claveModal?.espacio?.nombreEspacio}"</span> requiere una clave.
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
              {validando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ingresar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}