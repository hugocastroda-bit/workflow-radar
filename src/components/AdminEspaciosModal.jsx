import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Check, X, PowerOff, Power, Trash2, Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function ConfirmModal({ open, title, description, confirmLabel, confirmVariant = "destructive", onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={onConfirm} disabled={loading}
            className={confirmVariant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEspaciosModal({ open, onClose, user }) {
  const [espacios, setEspacios] = useState([]);
  const [membCounts, setMembCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [crearForm, setCrearForm] = useState({ nombreEspacio: "", descripcion: "", estado: "Activo" });
  const [confirm, setConfirm] = useState(null); // { type: "inactivar"|"eliminar", espacio }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todos, membs] = await Promise.all([
        base44.entities.EspacioEquipo.list(),
        base44.entities.MembresiaEspacio.filter({ estado: "Activo" }),
      ]);
      setEspacios(todos.sort((a, b) => a.nombreEspacio?.localeCompare(b.nombreEspacio)));
      const counts = {};
      membs.forEach(m => { counts[m.espacioId] = (counts[m.espacioId] || 0) + 1; });
      setMembCounts(counts);
    } catch {
      toast.error("No se pudieron cargar los espacios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleCrear = async () => {
    if (!crearForm.nombreEspacio.trim()) return;
    setSaving(true);
    try {
      await base44.entities.EspacioEquipo.create({
        nombreEspacio: crearForm.nombreEspacio.trim(),
        descripcion: crearForm.descripcion.trim(),
        estado: crearForm.estado,
        creadoPor: user?.email || "",
        requiereClave: false,
      });
      toast.success("Espacio creado");
      setCrearForm({ nombreEspacio: "", descripcion: "", estado: "Activo" });
      setShowCrear(false);
      load();
    } catch { toast.error("No se pudo crear el espacio."); }
    setSaving(false);
  };

  const startEdit = (espacio) => {
    setEditingId(espacio.id);
    setEditForm({ nombreEspacio: espacio.nombreEspacio, descripcion: espacio.descripcion || "" });
  };

  const saveEdit = async (id) => {
    if (!editForm.nombreEspacio.trim()) return;
    setSaving(true);
    try {
      await base44.entities.EspacioEquipo.update(id, {
        nombreEspacio: editForm.nombreEspacio.trim(),
        descripcion: editForm.descripcion.trim(),
      });
      setEditingId(null);
      load();
    } catch { toast.error("No se pudo guardar."); }
    setSaving(false);
  };

  const handleToggleEstado = (espacio) => {
    if (espacio.estado === "Activo") {
      setConfirm({ type: "inactivar", espacio });
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
      await base44.entities.EspacioEquipo.update(confirm.espacio.id, { estado: "Inactivo" });
      toast.success("Espacio inactivado");
      setConfirm(null);
      load();
    } catch { toast.error("No se pudo inactivar."); }
    setConfirmLoading(false);
  };

  const handleEliminar = (espacio) => {
    setConfirm({ type: "eliminar", espacio });
  };

  const doEliminar = async () => {
    setConfirmLoading(true);
    try {
      const res = await base44.functions.invoke("eliminarEspacio", { espacioId: confirm.espacio.id });
      if (res.data?.eliminado) {
        toast.success("Espacio eliminado");
        setConfirm(null);
        load();
      } else {
        toast.error(res.data?.message || "No se puede eliminar este espacio.");
        setConfirm(null);
      }
    } catch { toast.error("Error al intentar eliminar el espacio."); }
    setConfirmLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-slate-500" />
              Gestión de espacios
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCrear(true)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs">
              <Plus className="h-3.5 w-3.5" /> Crear espacio
            </Button>
          </div>

          {showCrear && (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nuevo espacio</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={crearForm.nombreEspacio} onChange={e => setCrearForm(f => ({ ...f, nombreEspacio: e.target.value }))}
                  placeholder="Nombre del espacio *" className="h-8 text-sm col-span-2" />
                <Input value={crearForm.descripcion} onChange={e => setCrearForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción breve (opcional)" className="h-8 text-sm col-span-2" />
                <select value={crearForm.estado} onChange={e => setCrearForm(f => ({ ...f, estado: e.target.value }))}
                  className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowCrear(false); setCrearForm({ nombreEspacio: "", descripcion: "", estado: "Activo" }); }} className="text-xs h-7">Cancelar</Button>
                <Button size="sm" onClick={handleCrear} disabled={saving || !crearForm.nombreEspacio.trim()} className="text-xs h-7 bg-slate-900 hover:bg-slate-800 text-white">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Crear"}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : espacios.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No hay espacios creados.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Espacio</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Descripción</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Accesos</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espacios.map(espacio => (
                    <tr key={espacio.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      {editingId === espacio.id ? (
                        <>
                          <td className="px-4 py-2.5" colSpan={2}>
                            <div className="space-y-1.5">
                              <Input value={editForm.nombreEspacio} onChange={e => setEditForm(f => ({ ...f, nombreEspacio: e.target.value }))}
                                className="h-7 text-xs" placeholder="Nombre *" />
                              <Input value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                                className="h-7 text-xs" placeholder="Descripción" />
                            </div>
                          </td>
                          <td colSpan={2} />
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => saveEdit(espacio.id)} disabled={saving} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-700">{espacio.nombreEspacio}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell max-w-xs truncate">{espacio.descripcion || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                              espacio.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {espacio.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">
                            {membCounts[espacio.id] || 0}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => startEdit(espacio)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {espacio.estado === "Activo" ? (
                                <button onClick={() => handleToggleEstado(espacio)} className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600" title="Inactivar">
                                  <PowerOff className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button onClick={() => handleToggleEstado(espacio)} className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="Activar">
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => handleEliminar(espacio)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirm?.type === "inactivar"}
        title="Inactivar espacio"
        description={`¿Deseas inactivar el espacio "${confirm?.espacio?.nombreEspacio}"? Los usuarios asignados ya no podrán acceder mientras esté inactivo.`}
        confirmLabel="Sí, inactivar"
        onConfirm={doInactivar}
        onCancel={() => setConfirm(null)}
        loading={confirmLoading}
      />
      <ConfirmModal
        open={confirm?.type === "eliminar"}
        title="Eliminar espacio"
        description={`¿Estás seguro de que deseas eliminar el espacio "${confirm?.espacio?.nombreEspacio}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar espacio"
        onConfirm={doEliminar}
        onCancel={() => setConfirm(null)}
        loading={confirmLoading}
      />
    </>
  );
}