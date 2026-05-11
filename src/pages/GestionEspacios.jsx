import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminGlobal } from "@/lib/EspacioContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Users, Key, ArrowLeft, LayoutGrid, MoreHorizontal, Pencil, PowerOff, Power, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ROL_LABELS = {
  "Owner Espacio": "Propietario",
  "Admin Espacio": "Administrador",
  "User Espacio": "Usuario",
  "Solo lectura": "Solo lectura",
};

const normName = (s) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function GestionEspacios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAppAdmin = isAdminGlobal(user);

  const [espacios, setEspacios] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Nuevo espacio
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ nombreEspacio: "", descripcion: "", requiereClave: false, clave: "" });
  const [crearError, setCrearError] = useState("");
  const [saving, setSaving] = useState(false);

  // Editar espacio
  const [showEditar, setShowEditar] = useState(null); // espacio object
  const [editForm, setEditForm] = useState({ nombreEspacio: "", descripcion: "", estado: "Activo" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Miembros / Clave
  const [showMiembros, setShowMiembros] = useState(null);
  const [showClave, setShowClave] = useState(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [savingClave, setSavingClave] = useState(false);
  const [nuevoMiembro, setNuevoMiembro] = useState({ correo: "", rol: "User Espacio" });
  const [addingMiembro, setAddingMiembro] = useState(false);

  // Confirmaciones
  const [confirmModal, setConfirmModal] = useState(null); // { type, espacio, message }
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Duplicados
  const [duplicados, setDuplicados] = useState([]);

  const load = async () => {
    setLoading(true);
    const [esp, memb] = await Promise.all([
      base44.entities.EspacioEquipo.list("nombreEspacio"),
      base44.entities.MembresiaEspacio.list("correoUsuario"),
    ]);
    setEspacios(esp);
    setMembresias(memb);
    setLoading(false);
    const groups = {};
    esp.forEach(e => {
      const key = normName(e.nombreEspacio);
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    setDuplicados(Object.values(groups).filter(g => g.length > 1));
  };

  useEffect(() => { load(); }, []);

  // ---- Crear espacio ----
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
    const espacio = await base44.entities.EspacioEquipo.create({
      nombreEspacio: nuevoForm.nombreEspacio.trim(),
      descripcion: nuevoForm.descripcion.trim() || undefined,
      estado: "Activo",
      creadoPor: user?.email,
      requiereClave: nuevoForm.requiereClave,
      ...(claveAccesoHash ? { claveAccesoHash } : {}),
    });
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

  // ---- Editar espacio ----
  const openEditar = (espacio) => {
    setShowEditar(espacio);
    setEditForm({ nombreEspacio: espacio.nombreEspacio, descripcion: espacio.descripcion || "", estado: espacio.estado || "Activo" });
    setEditError("");
  };

  const handleGuardarEditar = async () => {
    if (!editForm.nombreEspacio.trim()) return;
    const existe = espacios.some(e => e.id !== showEditar.id && normName(e.nombreEspacio) === normName(editForm.nombreEspacio));
    if (existe) { setEditError("Ya existe un espacio con este nombre."); return; }
    setEditError("");
    setEditSaving(true);
    await base44.entities.EspacioEquipo.update(showEditar.id, {
      nombreEspacio: editForm.nombreEspacio.trim(),
      descripcion: editForm.descripcion.trim(),
      estado: editForm.estado,
    });
    toast.success("Espacio actualizado correctamente.");
    setShowEditar(null);
    setEditSaving(false);
    load();
  };

  // ---- Clave ----
  const handleResetClave = async () => {
    if (!nuevaClave.trim()) return;
    setSavingClave(true);
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(nuevaClave.trim()));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    await base44.entities.EspacioEquipo.update(showClave, { claveAccesoHash: hash, requiereClave: true });
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

  // ---- Miembros ----
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

  // ---- Inactivar / Activar / Eliminar ----
  const doActivar = async (espacio) => {
    await base44.entities.EspacioEquipo.update(espacio.id, { estado: "Activo" });
    toast.success("Espacio activado correctamente.");
    load();
  };

  const doInactivar = async () => {
    setConfirmLoading(true);
    await base44.entities.EspacioEquipo.update(confirmModal.espacio.id, { estado: "Inactivo" });
    toast.success("Espacio inactivado correctamente.");
    setConfirmModal(null);
    setConfirmLoading(false);
    load();
  };

  const doEliminar = async () => {
    setConfirmLoading(true);
    const res = await base44.functions.invoke("eliminarEspacio", { espacioId: confirmModal.espacio.id });
    if (res.data?.eliminado) {
      toast.success("Espacio eliminado correctamente.");
      setConfirmModal(null);
    } else if (res.data?.tieneInfo) {
      setConfirmModal({ type: "eliminar_con_info", espacio: confirmModal.espacio, message: res.data.message });
    } else {
      toast.error(res.data?.message || "No se pudo eliminar el espacio.");
      setConfirmModal(null);
    }
    setConfirmLoading(false);
    load();
  };

  const doInactivarDesdeEliminar = async () => {
    setConfirmLoading(true);
    await base44.entities.EspacioEquipo.update(confirmModal.espacio.id, { estado: "Inactivo" });
    toast.success("Espacio inactivado correctamente.");
    setConfirmModal(null);
    setConfirmLoading(false);
    load();
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
      {/* Header */}
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
        <span className="text-xs text-slate-400">Radar C&amp;T</span>
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

        {/* Duplicados warning */}
        {duplicados.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Existen espacios duplicados</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Revisa y consolida antes de eliminar:&nbsp;
                {duplicados.map(g => `"${g[0].nombreEspacio}" (${g.length})`).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Spaces list */}
        <div className="space-y-3">
          {espacios.map(espacio => {
            const miembrosActivos = membresias.filter(m => m.espacioId === espacio.id && m.estado === "Activo").length;
            return (
              <div key={espacio.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{espacio.nombreEspacio}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${espacio.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {espacio.estado}
                    </span>
                    {espacio.requiereClave && (
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700">Con clave</span>
                    )}
                  </div>
                  {espacio.descripcion && <p className="text-xs text-slate-400 mt-0.5 truncate">{espacio.descripcion}</p>}
                  <p className="text-xs text-slate-400 mt-1">{miembrosActivos} miembro{miembrosActivos !== 1 ? "s" : ""} activo{miembrosActivos !== 1 ? "s" : ""}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setShowMiembros(espacio.id)} className="gap-1.5 text-xs h-8">
                    <Users className="h-3.5 w-3.5" /> Miembros
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowClave(espacio.id); setNuevaClave(""); }} className="gap-1.5 text-xs h-8">
                    <Key className="h-3.5 w-3.5" /> Clave
                  </Button>

                  {/* Dropdown acciones */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-500">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEditar(espacio)} className="gap-2 text-xs cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" /> Editar espacio
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {espacio.estado === "Activo" ? (
                        <DropdownMenuItem onClick={() => setConfirmModal({ type: "inactivar", espacio })} className="gap-2 text-xs cursor-pointer text-amber-600 focus:text-amber-700">
                          <PowerOff className="h-3.5 w-3.5" /> Inactivar espacio
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => doActivar(espacio)} className="gap-2 text-xs cursor-pointer text-emerald-600 focus:text-emerald-700">
                          <Power className="h-3.5 w-3.5" /> Activar espacio
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirmModal({ type: "eliminar", espacio })} className="gap-2 text-xs cursor-pointer text-red-600 focus:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar espacio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>

        {espacios.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No hay espacios creados.</p>
        )}
      </div>

      {/* ===== MODALES ===== */}

      {/* Nuevo espacio */}
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

      {/* Editar espacio */}
      <Dialog open={!!showEditar} onOpenChange={(v) => { if (!v) setShowEditar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm font-semibold flex items-center gap-2"><Pencil className="h-4 w-4" /> Editar espacio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Nombre *</p>
              <Input value={editForm.nombreEspacio} onChange={e => { setEditForm(f => ({ ...f, nombreEspacio: e.target.value })); setEditError(""); }} placeholder="Nombre del espacio" className="text-sm" />
              {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Descripción</p>
              <Input value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del espacio" className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Estado</p>
              <Select value={editForm.estado} onValueChange={v => setEditForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditar(null)} disabled={editSaving}>Cancelar</Button>
            <Button size="sm" onClick={handleGuardarEditar} disabled={editSaving || !editForm.nombreEspacio.trim()} className="bg-slate-900 text-white">
              {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm inactivar */}
      {confirmModal?.type === "inactivar" && (
        <Dialog open onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Inactivar espacio</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">¿Deseas inactivar el espacio <strong>{confirmModal.espacio.nombreEspacio}</strong>? Los usuarios asignados ya no podrán acceder mientras esté inactivo.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
              <Button size="sm" onClick={doInactivar} disabled={confirmLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {confirmLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, inactivar espacio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm eliminar */}
      {confirmModal?.type === "eliminar" && (
        <Dialog open onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Eliminar espacio</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">¿Estás seguro de que deseas eliminar este espacio? Esta acción solo será posible si el espacio no tiene información asociada.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
              <Button size="sm" onClick={doEliminar} disabled={confirmLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {confirmLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, eliminar espacio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Eliminar bloqueado — ofrecer inactivar */}
      {confirmModal?.type === "eliminar_con_info" && (
        <Dialog open onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> No se puede eliminar</DialogTitle></DialogHeader>
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

      {/* Miembros modal */}
      <Dialog open={!!showMiembros} onOpenChange={() => setShowMiembros(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-sm font-semibold">Miembros del espacio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={nuevoMiembro.correo} onChange={e => setNuevoMiembro(f => ({ ...f, correo: e.target.value }))} placeholder="correo@empresa.com" className="text-xs h-8 flex-1" />
              <select value={nuevoMiembro.rol} onChange={e => setNuevoMiembro(f => ({ ...f, rol: e.target.value }))} className="h-8 text-xs border border-slate-200 rounded-md px-2">
                {Object.entries(ROL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button size="sm" onClick={() => handleAgregarMiembro(showMiembros)} disabled={addingMiembro || !nuevoMiembro.correo.trim()} className="h-8 text-xs bg-slate-900 text-white">
                {addingMiembro ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
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