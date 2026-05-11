import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Check, X, PowerOff, Power, ShieldOff, Building2, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { isAdminGlobal, useEspacio } from "@/lib/EspacioContext";
import { toast } from "sonner";
import { invalidateCatalogCache } from "@/components/PedidoForm";
import GestionarEspaciosModal from "@/components/GestionarEspaciosModal";
import AdminEspaciosModal from "@/components/AdminEspaciosModal";

const TABS = [
  { key: "Solicitante",  label: "Solicitantes",  extra: "cargo_area",  extraLabel: "Cargo o área",  extra2: "email", extraLabel2: "Correo" },
  { key: "Responsable",  label: "Responsables",  extra: "rol_funcion", extraLabel: "Rol o función", extra2: "email", extraLabel2: "Correo" },
  { key: "Proceso",      label: "Procesos",      extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null },
  { key: "Prioridad",    label: "Prioridades",   extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null },
  { key: "notificaciones", label: "Notificaciones", extra: null, extraLabel: null, extra2: null, extraLabel2: null },
];

function NotificacionesTab() {
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ConfigNotificaciones.list().then(d => {
      if (d.length > 0) { setConfig(d[0]); setConfigId(d[0].id); }
      else setConfig({ notif_asignado: true, notif_bloqueado: true, notif_vencido: false, notif_cerrado: false });
    });
  }, []);

  const toggle = async (key) => {
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    setSaving(true);
    try {
      if (configId) await base44.entities.ConfigNotificaciones.update(configId, updated);
      else { const created = await base44.entities.ConfigNotificaciones.create(updated); setConfigId(created.id); }
      toast.success("Configuración guardada");
    } catch { toast.error("No se pudo guardar"); }
    setSaving(false);
  };

  if (!config) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>;

  const items = [
    { key: "notif_asignado", label: "Nuevo pedido asignado", desc: "Envía correo al responsable cuando se le asigna un pedido" },
    { key: "notif_bloqueado", label: "Pedido bloqueado", desc: "Notifica al responsable y solicitante cuando un pedido pasa a Bloqueado" },
    { key: "notif_vencido", label: "Pedido vencido", desc: "Alerta diaria al responsable cuando la fecha requerida ya pasó" },
    { key: "notif_cerrado", label: "Pedido cerrado", desc: "Notifica al solicitante cuando el pedido se cierra" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">Los correos se envían usando el servicio transaccional de Base44. Asegúrate de registrar el correo de cada responsable y solicitante en sus respectivas pestañas.</p>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {items.map((item, i) => (
          <div key={item.key} className={`flex items-start justify-between gap-4 px-5 py-4 ${i < items.length - 1 ? "border-b border-slate-100" : ""}` }>
            <div>
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              disabled={saving}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                config[item.key] ? "bg-slate-800" : "bg-slate-200"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                config[item.key] ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAMPO_PEDIDO = { Solicitante: "solicitante", Responsable: "responsable", Proceso: "proceso", Prioridad: "prioridad" };

function CatalogoTab({ entityKey, extraField, extraLabel, extraField2, extraLabel2, onExtraAction, espacioId }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm]   = useState({ nombre: "", ...(extraField ? { [extraField]: "" } : {}), ...(extraField2 ? { [extraField2]: "" } : {}) });
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // item
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [blockModal, setBlockModal] = useState(null); // { item, message }

  const load = () => {
    setLoading(true);
    const query = espacioId ? { espacioId } : {};
    base44.entities[entityKey].filter(query, "nombre").then(d => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entityKey]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      nombre: item.nombre,
      ...(extraField ? { [extraField]: item[extraField] || "" } : {}),
      ...(extraField2 ? { [extraField2]: item[extraField2] || "" } : {}),
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const data = { nombre: editForm.nombre.trim() };
      if (extraField) data[extraField] = editForm[extraField] || "";
      if (extraField2) data[extraField2] = (editForm[extraField2] || "").toLowerCase().trim();
      await base44.entities[entityKey].update(id, data);
      setEditingId(null);
      invalidateCatalogCache(espacioId);
      load();
    } catch { toast.error("No se pudo guardar. Inténtalo nuevamente."); }
    setSaving(false);
  };

  const toggleActivo = async (item) => {
    try {
      await base44.entities[entityKey].update(item.id, { activo: !item.activo });
      invalidateCatalogCache(espacioId);
      load();
    } catch { toast.error("No se pudo actualizar."); }
  };

  const handleDeleteRequest = (item) => setConfirmDelete(item);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      const campoPedido = CAMPO_PEDIDO[entityKey];
      let pedidosAsociados = [];
      if (campoPedido) {
        const query = { [campoPedido]: confirmDelete.nombre };
        if (espacioId) query.espacioId = espacioId;
        pedidosAsociados = await base44.entities.Pedido.filter(query);
      }
      if (pedidosAsociados.length > 0) {
        setConfirmDelete(null);
        setBlockModal({ item: confirmDelete, message: "No se puede eliminar esta opción porque tiene información asociada. Puedes inactivarla para que no vuelva a aparecer en nuevos pedidos." });
      } else {
        await base44.entities[entityKey].delete(confirmDelete.id);
        toast.success("Opción eliminada correctamente.");
        setConfirmDelete(null);
        invalidateCatalogCache(espacioId);
        load();
      }
    } catch { toast.error("No se pudo eliminar la opción. Inténtalo nuevamente."); }
    setDeleteLoading(false);
  };

  const handleInactivarDesdeBloqueo = async () => {
    if (!blockModal) return;
    try {
      await base44.entities[entityKey].update(blockModal.item.id, { activo: false });
      toast.success("Opción inactivada correctamente.");
      setBlockModal(null);
      invalidateCatalogCache(espacioId);
      load();
    } catch { toast.error("No se pudo inactivar."); }
  };

  const handleAdd = async () => {
    if (!newForm.nombre.trim()) return;
    setSaving(true);
    try {
      const data = { nombre: newForm.nombre.trim(), activo: true };
      if (espacioId) data.espacioId = espacioId;
      if (extraField) data[extraField] = newForm[extraField] || "";
      if (extraField2) data[extraField2] = (newForm[extraField2] || "").toLowerCase().trim();
      await base44.entities[entityKey].create(data);
      setNewForm({ nombre: "", ...(extraField ? { [extraField]: "" } : {}), ...(extraField2 ? { [extraField2]: "" } : {}) });
      setAdding(false);
      invalidateCatalogCache(espacioId);
      load();
    } catch { toast.error("No se pudo agregar. Intenta nuevamente."); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>;

  const activos   = items.filter(i => i.activo !== false);
  const inactivos = items.filter(i => i.activo === false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {adding && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nueva opción</p>
          <div className={`grid gap-2 ${extraField2 ? "grid-cols-3" : extraField ? "grid-cols-2" : "grid-cols-1"}`}>
            <Input value={newForm.nombre} onChange={e => setNewForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre *" className="h-8 text-sm" />
            {extraField && (
              <Input value={newForm[extraField] || ""} onChange={e => setNewForm(f => ({ ...f, [extraField]: e.target.value }))}
                placeholder={extraLabel} className="h-8 text-sm" />
            )}
            {extraField2 && (
              <Input value={newForm[extraField2] || ""} onChange={e => setNewForm(f => ({ ...f, [extraField2]: e.target.value }))}
                placeholder={extraLabel2} className="h-8 text-sm" type="email" />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewForm({ nombre: "", [extraField]: "" }); }} className="text-xs h-7">Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newForm.nombre.trim()} className="text-xs h-7 bg-slate-900 hover:bg-slate-800 text-white">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {/* Active items */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activos ({activos.length})</span>
        </div>
        {activos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin opciones activas</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {activos.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0">
                  {editingId === item.id ? (
                    <>
                      <td className="px-4 py-2.5" colSpan={extraField2 ? 3 : extraField ? 2 : 1}>
                            <div className={`grid gap-2 ${extraField2 ? "grid-cols-3" : extraField ? "grid-cols-2" : "grid-cols-1"}`}>
                              <Input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                                className="h-7 text-xs" />
                              {extraField && (
                                <Input value={editForm[extraField] || ""} onChange={e => setEditForm(f => ({ ...f, [extraField]: e.target.value }))}
                                  placeholder={extraLabel} className="h-7 text-xs" />
                              )}
                              {extraField2 && (
                                <Input value={editForm[extraField2] || ""} onChange={e => setEditForm(f => ({ ...f, [extraField2]: e.target.value }))}
                                  placeholder={extraLabel2} className="h-7 text-xs" type="email" />
                              )}
                            </div>
                          </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => saveEdit(item.id)} disabled={saving} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-2.5 font-medium text-slate-700">{item.nombre}</td>
                      {extraField && <td className="px-4 py-2.5 text-slate-400 text-xs">{item[extraField] || "—"}</td>}
                      {extraField2 && <td className="px-4 py-2.5 text-slate-400 text-xs">{item[extraField2] || <span className="text-amber-500">Sin correo</span>}</td>}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {onExtraAction && (
                            <button onClick={() => onExtraAction(item)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Gestionar espacios">
                              <Building2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="Desactivar">
                            <PowerOff className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteRequest(item)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
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
        )}
      </div>

      {/* Inactive items */}
      {inactivos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactivos ({inactivos.length})</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {inactivos.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 opacity-60">
                  <td className="px-5 py-2.5 text-slate-500 line-through">{item.nombre}</td>
                  {extraField && <td className="px-4 py-2.5 text-slate-400 text-xs">{item[extraField] || "—"}</td>}
                  {extraField2 && <td className="px-4 py-2.5 text-slate-400 text-xs">{item[extraField2] || "—"}</td>}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Reactivar">
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteRequest(item)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Eliminar opción</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">¿Estás seguro de que deseas eliminar <strong>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer si no tiene información asociada.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleteLoading}>Cancelar</Button>
              <Button size="sm" onClick={handleDeleteConfirm} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {deleteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Blocked delete — offer inactivate */}
      {blockModal && (
        <Dialog open onOpenChange={() => setBlockModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> No se puede eliminar</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">{blockModal.message}</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setBlockModal(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleInactivarDesdeBloqueo} className="bg-amber-600 hover:bg-amber-700 text-white">Inactivar opción</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState("Solicitante");
  const [gestionarModal, setGestionarModal] = useState(null);
  const [showAdminEspacios, setShowAdminEspacios] = useState(false);
  const { user } = useAuth();
  const { espacioActivo } = useEspacio();
  const isAdmin = isAdminGlobal(user);
  const tab = TABS.find(t => t.key === activeTab);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <ShieldOff className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No tienes permisos para acceder a esta sección.</p>
          <p className="text-xs text-slate-400">Solo los usuarios Admin pueden gestionar la configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Configuración</h1>
        <p className="text-xs text-slate-400 mt-0.5">Administra las listas maestras de los desplegables del formulario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "Responsable" && isAdmin && (
        <div className="flex justify-end -mb-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdminEspacios(true)} className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Administrar espacios
          </Button>
        </div>
      )}

      {activeTab === "notificaciones" ? (
        <NotificacionesTab />
      ) : (
        <CatalogoTab
          key={activeTab + (espacioActivo?.id || "")}
          entityKey={tab.key}
          extraField={tab.extra}
          extraLabel={tab.extraLabel}
          extraField2={tab.extra2}
          extraLabel2={tab.extraLabel2}
          onExtraAction={activeTab === "Responsable" && isAdmin ? (item) => setGestionarModal(item) : null}
          espacioId={espacioActivo?.id}
        />
      )}

      <GestionarEspaciosModal
        responsable={gestionarModal}
        open={!!gestionarModal}
        onClose={() => setGestionarModal(null)}
      />

      <AdminEspaciosModal
        open={showAdminEspacios}
        onClose={() => setShowAdminEspacios(false)}
        user={user}
      />
    </div>
  );
}