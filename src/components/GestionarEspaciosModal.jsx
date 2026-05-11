import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, X, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const ROL_OPCIONES = ["Admin Espacio", "User Espacio", "Solo lectura"];
const ROL_LABELS = {
  "Owner Espacio": "Propietario",
  "Admin Espacio": "Administrador",
  "User Espacio": "Usuario",
  "Solo lectura": "Solo lectura",
};

export default function GestionarEspaciosModal({ responsable, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [accesos, setAccesos] = useState([]);
  const [espaciosDisp, setEspaciosDisp] = useState([]);
  const [showAsignar, setShowAsignar] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [asignForm, setAsignForm] = useState({ espacioId: "", rol: "User Espacio" });
  const [crearForm, setCrearForm] = useState({ nombreEspacio: "", descripcion: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [memb, espacios] = await Promise.all([
      base44.entities.MembresiaEspacio.filter({ correoUsuario: responsable.email }),
      base44.entities.EspacioEquipo.filter({ estado: "Activo" }),
    ]);
    setAccesos(memb.map(m => ({
      ...m,
      espacio: espacios.find(e => e.id === m.espacioId),
    })).filter(m => m.espacio));
    setEspaciosDisp(espacios);
    setLoading(false);
  };

  useEffect(() => {
    if (open && responsable?.email) load();
  }, [open, responsable?.email]);

  const handleAsignar = async () => {
    if (!asignForm.espacioId) return;
    setSaving(true);
    const yaExiste = accesos.find(a => a.espacioId === asignForm.espacioId);
    if (yaExiste) {
      await base44.entities.MembresiaEspacio.update(yaExiste.id, {
        rolEnEspacio: asignForm.rol,
        estado: "Activo",
      });
      toast.success("Acceso actualizado");
    } else {
      await base44.entities.MembresiaEspacio.create({
        espacioId: asignForm.espacioId,
        correoUsuario: responsable.email,
        rolEnEspacio: asignForm.rol,
        estado: "Activo",
        fechaAlta: new Date().toISOString().split("T")[0],
        validadoConClave: false,
      });
      toast.success("Espacio asignado");
    }
    setAsignForm({ espacioId: "", rol: "User Espacio" });
    setShowAsignar(false);
    setSaving(false);
    load();
  };

  const handleCrearEspacio = async () => {
    if (!crearForm.nombreEspacio.trim()) return;
    setSaving(true);
    const nuevo = await base44.entities.EspacioEquipo.create({
      nombreEspacio: crearForm.nombreEspacio.trim(),
      descripcion: crearForm.descripcion.trim(),
      estado: "Activo",
      creadoPor: responsable.email,
      requiereClave: false,
    });
    toast.success("Espacio creado");
    setCrearForm({ nombreEspacio: "", descripcion: "" });
    setShowCrear(false);
    // auto-select for assignment
    const nuevosEspacios = [...espaciosDisp, nuevo];
    setEspaciosDisp(nuevosEspacios);
    setAsignForm(f => ({ ...f, espacioId: nuevo.id }));
    setShowAsignar(true);
    setSaving(false);
  };

  const toggleAcceso = async (acceso) => {
    await base44.entities.MembresiaEspacio.update(acceso.id, {
      estado: acceso.estado === "Activo" ? "Inactivo" : "Activo",
    });
    load();
  };

  const quitarAcceso = async (acceso) => {
    await base44.entities.MembresiaEspacio.delete(acceso.id);
    toast.success("Acceso eliminado");
    load();
  };

  const cambiarRol = async (acceso, nuevoRol) => {
    await base44.entities.MembresiaEspacio.update(acceso.id, { rolEnEspacio: nuevoRol });
    load();
  };

  if (!responsable) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            Espacios asignados
          </DialogTitle>
        </DialogHeader>

        {/* Info del responsable */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-0.5 border border-slate-100">
          <p className="text-sm font-semibold text-slate-800">{responsable.nombre}</p>
          {responsable.rol_funcion && <p className="text-xs text-slate-500">{responsable.rol_funcion}</p>}
          {responsable.email && <p className="text-xs text-slate-400">{responsable.email}</p>}
        </div>

        {/* Lista de accesos */}
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-2">
            {accesos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin espacios asignados aún.</p>
            ) : (
              accesos.map(acceso => (
                <div key={acceso.id} className={`border rounded-lg px-4 py-3 space-y-2 ${
                  acceso.estado === "Activo" ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{acceso.espacio.nombreEspacio}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={acceso.rolEnEspacio}
                          onChange={e => cambiarRol(acceso, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-600"
                        >
                          {ROL_OPCIONES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
                        </select>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          acceso.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}>
                          {acceso.estado}
                        </span>
                      </div>
                      {acceso.fechaAlta && (
                        <p className="text-xs text-slate-300 mt-1">Desde {acceso.fechaAlta}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleAcceso(acceso)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          acceso.estado === "Activo"
                            ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {acceso.estado === "Activo" ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => quitarAcceso(acceso)}
                        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                        title="Quitar acceso"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Asignar espacio */}
        {!showAsignar && !showCrear && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setShowAsignar(true)} className="text-xs gap-1.5 flex-1">
              <Plus className="h-3.5 w-3.5" /> Asignar espacio
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCrear(true)} className="text-xs gap-1.5 flex-1">
              <Building2 className="h-3.5 w-3.5" /> Crear nuevo espacio
            </Button>
          </div>
        )}

        {showAsignar && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Asignar espacio</p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={asignForm.espacioId}
                onChange={e => setAsignForm(f => ({ ...f, espacioId: e.target.value }))}
                className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white col-span-2"
              >
                <option value="">Seleccionar espacio…</option>
                {espaciosDisp.map(e => (
                  <option key={e.id} value={e.id}>{e.nombreEspacio}</option>
                ))}
              </select>
              <select
                value={asignForm.rol}
                onChange={e => setAsignForm(f => ({ ...f, rol: e.target.value }))}
                className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white"
              >
                {ROL_OPCIONES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
              </select>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleAsignar} disabled={saving || !asignForm.espacioId} className="text-xs bg-slate-900 text-white flex-1 h-8">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAsignar(false); setAsignForm({ espacioId: "", rol: "User Espacio" }); }} className="text-xs h-8">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {showCrear && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Crear nuevo espacio</p>
            <Input
              value={crearForm.nombreEspacio}
              onChange={e => setCrearForm(f => ({ ...f, nombreEspacio: e.target.value }))}
              placeholder="Nombre del espacio *"
              className="h-8 text-xs"
            />
            <Input
              value={crearForm.descripcion}
              onChange={e => setCrearForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción breve (opcional)"
              className="h-8 text-xs"
            />
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowCrear(false); setCrearForm({ nombreEspacio: "", descripcion: "" }); }} className="text-xs h-7">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCrearEspacio} disabled={saving || !crearForm.nombreEspacio.trim()} className="text-xs h-7 bg-slate-900 text-white">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Crear"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}