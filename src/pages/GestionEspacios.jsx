import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Key, ArrowLeft, LayoutGrid, Trash2, PowerOff, Power, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const normName = (s) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function GestionEspacios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAppAdmin = user?.role === "admin";

  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ nombreEspacio: "", descripcion: "", requiereClave: false, clave: "" });
  const [crearError, setCrearError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showClave, setShowClave] = useState(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [savingClave, setSavingClave] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [duplicados, setDuplicados] = useState([]);

  const load = async () => {
    try {
      const esp = await base44.entities.EspacioEquipo.list("nombreEspacio");
      setEspacios(esp);
      // Detect duplicates
      const groups = {};
      esp.forEach(e => {
        const key = normName(e.nombreEspacio);
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
      });
      setDuplicados(Object.values(groups).filter(g => g.length > 1));
    } catch {
      toast.error("No se pudieron cargar los espacios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCrearEspacio = async () => {
    if (!nuevoForm.nombreEspacio.trim()) return;
    const existe = espacios.some(e => normName(e.nombreEspacio) === normName(nuevoForm.nombreEspacio));
    if (existe) { setCrearError("Ya existe un espacio con este nombre."); return; }
    setCrearError("");
    setSaving(true);
    let claveAccesoHash = null;
    if (nuevoForm.requiereClave && nuevoForm.clave.trim()) {
      const encoder = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(nuevoForm.clave.trim()));
      claveAccesoHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    try {
      await base44.entities.EspacioEquipo.create({
        nombreEspacio: nuevoForm.nombreEspacio.trim(),
        descripcion: nuevoForm.descripcion.trim() || undefined,
        estado: "Activo",
        creadoPor: user?.email,
        requiereClave: nuevoForm.requiereClave,
        ...(claveAccesoHash ? { claveAccesoHash } : {}),
      });
      toast.success("Espacio creado correctamente");
      setShowNuevo(false);
      setNuevoForm({ nombreEspacio: "", descripcion: "", requiereClave: false, clave: "" });
      load();
    } catch {
      toast.error("No se pudo crear el espacio. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetClave = async () => {
    if (!nuevaClave.trim()) return;
    setSavingClave(true);
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(nuevaClave.trim()));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    try {
      await base44.entities.EspacioEquipo.update(showClave, { claveAccesoHash: hash, requiereClave: true });
      toast.success("Clave actualizada.");
      setShowClave(null);
      setNuevaClave("");
      load();
    } catch {
      toast.error("No se pudo actualizar la clave.");
    } finally {
      setSavingClave(false);
    }
  };

  const handleToggleEstado = (espacio) => {
    if (espacio.estado === "Activo") {
      setConfirmModal({ type: "inactivar", espacio });
    } else {
      doActivar(espacio);
    }
  };

  const doActivar = async (espacio) => {
    try {
      await base44.entities.EspacioEquipo.update(espacio.id, { estado: "Activo" });
      toast.success("Espacio reactivado");
      load();
    } catch { toast.error("No se pudo reactivar."); }
  };

  const doInactivar = async () => {
    setConfirmLoading(true);
    try {
      await base44.entities.EspacioEquipo.update(confirmModal.espacio.id, { estado: "Inactivo" });
      toast.success("Espacio inactivado. Los usuarios ya no podrán acceder.");
      setConfirmModal(null);
      load();
    } catch { toast.error("No se pudo inactivar."); }
    setConfirmLoading(false);
  };

  const handleEliminar = (espacio) => {
    setConfirmModal({ type: "eliminar", espacio });
  };

  const doEliminar = async () => {
    setConfirmLoading(true);
    try {
      const res = await base44.functions.invoke("eliminarEspacio", { espacioId: confirmModal.espacio.id });
      if (res.data?.eliminado) {
        toast.success("Espacio eliminado correctamente.");
        setConfirmModal(null);
        load();
      } else if (res.data?.tieneInfo) {
        setConfirmModal({ type: "eliminar_con_info", espacio: confirmModal.espacio, message: res.data.message });
      } else {
        toast.error(res.data?.message || "No se puede eliminar este espacio.");
        setConfirmModal(null);
      }
    } catch { toast.error("No se pudo eliminar el espacio. Inténtalo nuevamente."); }
    setConfirmLoading(false);
  };

  const doInactivarDesdeEliminar = async () => {
    setConfirmLoading(true);
    try {
      await base44.entities.EspacioEquipo.update(confirmModal.espacio.id, { estado: "Inactivo" });
      toast.success("Espacio inactivado.");
      setConfirmModal(null);
      load();
    } catch { toast.error("No se pudo inactivar."); }
    setConfirmLoading(false);
  };

  if (!isAppAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-slate-600">No tienes permisos para administrar espacios.</p>
          <button onClick={() => navigate("/espacios")} className="text-xs text-slate-400 hover:text-slate-600 underline">Volver</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/espacios")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </button>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Administración global</span>
          </div>
        </div>
        <span className="text-xs text-slate-400">Radar Gestión Humana</span>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Gestión de espacios</h1>
            <p className="text-xs text-slate-400 mt-0.5">{espacios.length} espacio{espacios.length !== 1 ? "s" : ""} creado{espacios.length !== 1 ? "s" : ""}</p>
          </div>
          <Button size="sm" onClick={() => { setShowNuevo(true); setCrearError(""); }} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="h-3.5 w-3.5" /> Nuevo espacio
          </Button>
        </div>

        {duplicados.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Existen espacios duplicados</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Revisa y consolida la información antes de eliminar:&nbsp;
                {duplicados.map(g => `"${g[0].nombreEspacio}" (${g.length})`).join(", ")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {espacios.map(espacio => (
            <div key={espacio.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{espacio.nombreEspacio}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${espacio.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {espacio.estado}
                    </span>
                    {espacio.requiereClave && (
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700">Con clave</span>
                    )}
                  </div>
                  {espacio.descripcion && <p className="text-xs text-slate-400 mt-0.5">{espacio.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowClave(espacio.id); setNuevaClave(""); }} className="gap-1.5 text-xs">
                    <Key className="h-3.5 w-3.5" /> Clave
                  </Button>
                  {espacio.estado === "Activo" ? (
                    <button onClick={() => handleToggleEstado(espacio)} className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-200" title="Inactivar">
                      <PowerOff className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => handleToggleEstado(espacio)} className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-200" title="Activar">
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleEliminar(espacio)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200" title="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {confirmModal?.type === "inactivar" && (
          <Dialog open onOpenChange={() => setConfirmModal(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" />Inactivar espacio</DialogTitle></DialogHeader>
              <p className="text-sm text-slate-600">¿Deseas inactivar el espacio <strong>{confirmModal.espacio.nombreEspacio}</strong>?</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
                <Button size="sm" onClick={doInactivar} disabled={confirmLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {confirmLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, inactivar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {confirmModal?.type === "eliminar" && (
          <Dialog open onOpenChange={() => setConfirmModal(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" />Eliminar espacio</DialogTitle></DialogHeader>
              <p className="text-sm text-slate-600">¿Estás seguro de que deseas eliminar este espacio?</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
                <Button size="sm" onClick={doEliminar} disabled={confirmLoading} className="bg-red-600 hover:bg-red-700 text-white">
                  {confirmLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, eliminar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {confirmModal?.type === "eliminar_con_info" && (
          <Dialog open onOpenChange={() => setConfirmModal(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" />No se puede eliminar</DialogTitle></DialogHeader>
              <p className="text-sm text-slate-600">{confirmModal.message}</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
                <Button size="sm" onClick={doInactivarDesdeEliminar} disabled={confirmLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {confirmLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Inactivar espacio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showNuevo} onOpenChange={(v) => { setShowNuevo(v); if (!v) setCrearError(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-sm font-semibold">Nuevo espacio de equipo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nombre *</p>
                <Input value={nuevoForm.nombreEspacio} onChange={e => { setNuevoForm(f => ({ ...f, nombreEspacio: e.target.value })); setCrearError(""); }} placeholder="Ej: Equipo Cultura" className="text-sm" />
                {crearError && <p className="text-xs text-red-600 mt-1">{crearError}</p>}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Descripción (opcional)</p>
                <Input value={nuevoForm.descripcion} onChange={e => setNuevoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del espacio" className="text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={nuevoForm.requiereClave} onChange={e => setNuevoForm(f => ({ ...f, requiereClave: e.target.checked }))} />
                <span className="text-xs text-slate-600">Requiere clave de acceso</span>
              </label>
              {nuevoForm.requiereClave && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Clave de acceso</p>
                  <Input type="password" value={nuevoForm.clave} onChange={e => setNuevoForm(f => ({ ...f, clave: e.target.value }))} placeholder="Clave del espacio" className="text-sm" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowNuevo(false); setCrearError(""); }} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleCrearEspacio} disabled={saving || !nuevoForm.nombreEspacio.trim()} className="bg-slate-900 text-white">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear espacio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showClave} onOpenChange={() => setShowClave(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Actualizar clave</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500">Ingresa la nueva clave del espacio.</p>
            <Input type="password" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Nueva clave" className="text-sm" />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowClave(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleResetClave} disabled={savingClave || !nuevaClave.trim()} className="bg-slate-900 text-white">
                {savingClave ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Actualizar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}