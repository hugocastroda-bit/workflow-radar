import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio } from "@/lib/EspacioContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Users, Settings, Key, Check, X, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ROL_LABELS = {
  "Owner Espacio": "Propietario",
  "Admin Espacio": "Administrador",
  "User Espacio": "Usuario",
  "Solo lectura": "Solo lectura",
};

export default function GestionEspacios() {
  const { user } = useAuth();
  const { membresiaActiva, espacioActivo } = useEspacio();
  const isAppAdmin = user?.role === "admin";
  const isOwner = membresiaActiva?.rolEnEspacio === "Owner Espacio";
  const canManage = isOwner || isAppAdmin;

  const [espacios, setEspacios] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ nombreEspacio: "", descripcion: "", requiereClave: false, clave: "" });
  const [saving, setSaving] = useState(false);
  const [showMiembros, setShowMiembros] = useState(null); // espacioId
  const [showClave, setShowClave] = useState(null); // espacioId
  const [nuevaClave, setNuevaClave] = useState("");
  const [savingClave, setSavingClave] = useState(false);
  const [nuevoMiembro, setNuevoMiembro] = useState({ correo: "", rol: "User Espacio" });
  const [addingMiembro, setAddingMiembro] = useState(false);

  const load = async () => {
    const [esp, memb] = await Promise.all([
      base44.entities.EspacioEquipo.list("nombreEspacio"),
      base44.entities.MembresiaEspacio.list("correoUsuario"),
    ]);
    setEspacios(esp);
    setMembresias(memb);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCrearEspacio = async () => {
    if (!nuevoForm.nombreEspacio.trim()) return;
    setSaving(true);
    let claveAccesoHash = null;
    if (nuevoForm.requiereClave && nuevoForm.clave.trim()) {
      const encoder = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(nuevoForm.clave.trim()));
      claveAccesoHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    const espacio = await base44.entities.EspacioEquipo.create({
      nombreEspacio: nuevoForm.nombreEspacio.trim(),
      descripcion: nuevoForm.descripcion.trim() || undefined,
      estado: "Activo",
      creadoPor: user?.email,
      requiereClave: nuevoForm.requiereClave,
      ...(claveAccesoHash ? { claveAccesoHash } : {}),
    });
    // Auto-add creator as Owner
    await base44.entities.MembresiaEspacio.create({
      espacioId: espacio.id,
      correoUsuario: user.email,
      rolEnEspacio: "Owner Espacio",
      estado: "Activo",
      fechaAlta: new Date().toISOString().split("T")[0],
      validadoConClave: true,
    });
    toast.success("Espacio creado correctamente");
    setShowNuevo(false);
    setNuevoForm({ nombreEspacio: "", descripcion: "", requiereClave: false, clave: "" });
    setSaving(false);
    load();
  };

  const handleResetClave = async () => {
    if (!nuevaClave.trim()) return;
    setSavingClave(true);
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(nuevaClave.trim()));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    await base44.entities.EspacioEquipo.update(showClave, { claveAccesoHash: hash, requiereClave: true });
    // Reset all validations
    const miembrosEspacio = membresias.filter(m => m.espacioId === showClave);
    for (const m of miembrosEspacio) {
      await base44.entities.MembresiaEspacio.update(m.id, { validadoConClave: false });
    }
    toast.success("Clave actualizada. Todos los miembros deberán validarse nuevamente.");
    setShowClave(null);
    setNuevaClave("");
    setSavingClave(false);
    load();
  };

  const handleAgregarMiembro = async (espacioId) => {
    if (!nuevoMiembro.correo.trim()) return;
    setAddingMiembro(true);
    await base44.entities.MembresiaEspacio.create({
      espacioId,
      correoUsuario: nuevoMiembro.correo.trim().toLowerCase(),
      rolEnEspacio: nuevoMiembro.rol,
      estado: "Activo",
      fechaAlta: new Date().toISOString().split("T")[0],
      validadoConClave: false,
    });
    toast.success("Miembro agregado correctamente");
    setNuevoMiembro({ correo: "", rol: "User Espacio" });
    setAddingMiembro(false);
    load();
  };

  const toggleMiembro = async (m) => {
    await base44.entities.MembresiaEspacio.update(m.id, { estado: m.estado === "Activo" ? "Inactivo" : "Activo" });
    load();
  };

  if (!isAppAdmin) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">Solo los administradores de la aplicación pueden gestionar espacios.</p>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Gestión de espacios</h1>
          <p className="text-xs text-slate-400 mt-0.5">{espacios.length} espacio{espacios.length !== 1 ? "s" : ""} creado{espacios.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowNuevo(true)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-3.5 w-3.5" /> Nuevo espacio
        </Button>
      </div>

      <div className="space-y-4">
        {espacios.map(espacio => {
          const miembrosEspacio = membresias.filter(m => m.espacioId === espacio.id);
          return (
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
                  <p className="text-xs text-slate-400 mt-1">{miembrosEspacio.filter(m => m.estado === "Activo").length} miembros activos</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowMiembros(espacio.id)} className="gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" /> Miembros
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowClave(espacio.id); setNuevaClave(""); }} className="gap-1.5 text-xs">
                    <Key className="h-3.5 w-3.5" /> Clave
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nuevo espacio modal */}
      <Dialog open={showNuevo} onOpenChange={setShowNuevo}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm font-semibold">Nuevo espacio de equipo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Nombre *</p>
              <Input value={nuevoForm.nombreEspacio} onChange={e => setNuevoForm(f => ({ ...f, nombreEspacio: e.target.value }))} placeholder="Ej: Equipo Cultura" className="text-sm" />
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
            <Button variant="outline" size="sm" onClick={() => setShowNuevo(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleCrearEspacio} disabled={saving || !nuevoForm.nombreEspacio.trim()} className="bg-slate-900 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear espacio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Miembros modal */}
      <Dialog open={!!showMiembros} onOpenChange={() => setShowMiembros(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-sm font-semibold">Miembros del espacio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Add member */}
            <div className="flex gap-2">
              <Input value={nuevoMiembro.correo} onChange={e => setNuevoMiembro(f => ({ ...f, correo: e.target.value }))} placeholder="correo@empresa.com" className="text-xs h-8 flex-1" />
              <select value={nuevoMiembro.rol} onChange={e => setNuevoMiembro(f => ({ ...f, rol: e.target.value }))} className="h-8 text-xs border border-slate-200 rounded-md px-2">
                {Object.entries(ROL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button size="sm" onClick={() => handleAgregarMiembro(showMiembros)} disabled={addingMiembro || !nuevoMiembro.correo.trim()} className="h-8 text-xs bg-slate-900 text-white">
                {addingMiembro ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
            {/* Member list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {membresias.filter(m => m.espacioId === showMiembros).map(m => (
                <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${m.estado === "Activo" ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{m.correoUsuario}</p>
                    <p className="text-xs text-slate-400">{ROL_LABELS[m.rolEnEspacio]}</p>
                  </div>
                  <button onClick={() => toggleMiembro(m)} className={`text-xs px-2 py-0.5 rounded ${m.estado === "Activo" ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                    {m.estado === "Activo" ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clave modal */}
      <Dialog open={!!showClave} onOpenChange={() => setShowClave(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Actualizar clave del espacio</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500">Al cambiar la clave, todos los miembros deberán ingresar la nueva clave la próxima vez que accedan.</p>
          <Input type="password" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Nueva clave del espacio" className="text-sm" />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowClave(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleResetClave} disabled={savingClave || !nuevaClave.trim()} className="bg-slate-900 text-white">
              {savingClave ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Actualizar clave"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}