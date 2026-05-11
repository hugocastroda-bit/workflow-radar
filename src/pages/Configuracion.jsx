import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Check, X, PowerOff, Power, ShieldOff, ArrowRight, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio, isAdminGlobal } from "@/lib/EspacioContext";
import { toast } from "sonner";

const TABS = [
  { key: "Solicitante",  label: "Solicitantes",  extra: "cargo_area",  extraLabel: "Cargo o área",  extra2: "email", extraLabel2: "Correo" },
  { key: "Responsable",  label: "Responsables",  extra: "rol_funcion", extraLabel: "Rol o función", extra2: "email", extraLabel2: "Correo" },
  { key: "Proceso",      label: "Procesos",      extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null },
  { key: "Prioridad",    label: "Prioridades",   extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null },
  { key: "notificaciones", label: "Notificaciones", extra: null, extraLabel: null, extra2: null, extraLabel2: null },
  { key: "espacios", label: "Espacios", extra: null, extraLabel: null, extra2: null, extraLabel2: null },
];

const ROL_LABELS = {
  "Owner Espacio": "Propietario",
  "Admin Espacio": "Administrador",
  "User Espacio": "Usuario",
  "Solo lectura": "Solo lectura",
};

function EspaciosTab({ user }) {
  const { espacioActivo, entrarEspacio, salirDeEspacio } = useEspacio();
  const isAdmin = isAdminGlobal(user);
  const [loading, setLoading] = useState(true);
  const [misEspacios, setMisEspacios] = useState([]);
  const [todosEspacios, setTodosEspacios] = useState([]);
  const [todasMembresias, setTodasMembresias] = useState([]);
  const [showAsignar, setShowAsignar] = useState(null); // espacioId
  const [nuevoMiembro, setNuevoMiembro] = useState({ correo: "", rol: "User Espacio" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [memb, espacios] = await Promise.all([
      base44.entities.MembresiaEspacio.filter({ correoUsuario: user.email, estado: "Activo" }),
      base44.entities.EspacioEquipo.filter({ estado: "Activo" }),
    ]);
    let allMemb = memb;
    if (isAdmin) {
      allMemb = await base44.entities.MembresiaEspacio.list();
      setTodasMembresias(allMemb);
      setTodosEspacios(espacios);
    }
    const result = memb.map(m => ({
      membresia: m,
      espacio: espacios.find(e => e.id === m.espacioId),
    })).filter(r => r.espacio);
    setMisEspacios(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCambiar = (espacio, membresia) => {
    entrarEspacio(espacio, membresia);
    toast.success(`Cambiaste al espacio "${espacio.nombreEspacio}"`);
  };

  const handleAgregarMiembro = async (espacioId) => {
    if (!nuevoMiembro.correo.trim()) return;
    setAdding(true);
    await base44.entities.MembresiaEspacio.create({
      espacioId,
      correoUsuario: nuevoMiembro.correo.trim().toLowerCase(),
      rolEnEspacio: nuevoMiembro.rol,
      estado: "Activo",
      fechaAlta: new Date().toISOString().split("T")[0],
      validadoConClave: false,
    });
    toast.success("Miembro asignado correctamente");
    setNuevoMiembro({ correo: "", rol: "User Espacio" });
    setAdding(false);
    setShowAsignar(null);
    load();
  };

  const toggleMembresia = async (m) => {
    await base44.entities.MembresiaEspacio.update(m.id, { estado: m.estado === "Activo" ? "Inactivo" : "Activo" });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Mis espacios */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mis espacios</p>
        {misEspacios.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No tienes espacios asignados.</p>
        ) : (
          <div className="space-y-2">
            {misEspacios.map(({ espacio, membresia }) => (
              <div key={espacio.id} className={`bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                espacioActivo?.id === espacio.id ? "border-slate-900" : "border-slate-200"
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{espacio.nombreEspacio}</p>
                    {espacioActivo?.id === espacio.id && (
                      <span className="text-xs bg-slate-900 text-white px-1.5 py-0.5 rounded">Activo</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{ROL_LABELS[membresia.rolEnEspacio] || membresia.rolEnEspacio}</p>
                </div>
                {espacioActivo?.id !== espacio.id && (
                  <Button size="sm" onClick={() => handleCambiar(espacio, membresia)} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
                    Entrar <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin: gestión de espacios */}
      {isAdmin && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administración de espacios</p>
          {todosEspacios.map(espacio => {
            const miembros = todasMembresias.filter(m => m.espacioId === espacio.id);
            return (
              <div key={espacio.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{espacio.nombreEspacio}</p>
                    <p className="text-xs text-slate-400">{miembros.filter(m => m.estado === "Activo").length} miembros activos</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowAsignar(showAsignar === espacio.id ? null : espacio.id)} className="gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" /> Gestionar miembros
                  </Button>
                </div>
                {showAsignar === espacio.id && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                    {/* Add member */}
                    <div className="flex gap-2">
                      <Input value={nuevoMiembro.correo} onChange={e => setNuevoMiembro(f => ({ ...f, correo: e.target.value }))} placeholder="correo@empresa.com" className="text-xs h-8 flex-1" />
                      <select value={nuevoMiembro.rol} onChange={e => setNuevoMiembro(f => ({ ...f, rol: e.target.value }))} className="h-8 text-xs border border-slate-200 rounded-md px-2">
                        {Object.entries(ROL_LABELS).filter(([v]) => v !== "Owner Espacio").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <Button size="sm" onClick={() => handleAgregarMiembro(espacio.id)} disabled={adding || !nuevoMiembro.correo.trim()} className="h-8 text-xs bg-slate-900 text-white">
                        {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    {/* Member list */}
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {miembros.map(m => (
                        <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs ${
                          m.estado === "Activo" ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
                        }`}>
                          <div>
                            <p className="font-medium text-slate-700">{m.correoUsuario}</p>
                            <p className="text-slate-400">{ROL_LABELS[m.rolEnEspacio] || m.rolEnEspacio}</p>
                          </div>
                          <button onClick={() => toggleMembresia(m)} className={`text-xs px-2 py-0.5 rounded ${
                            m.estado === "Activo" ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                          }`}>
                            {m.estado === "Activo" ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

function CatalogoTab({ entityKey, extraField, extraLabel, extraField2, extraLabel2 }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm]   = useState({ nombre: "", ...(extraField ? { [extraField]: "" } : {}), ...(extraField2 ? { [extraField2]: "" } : {}) });
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities[entityKey].list("nombre").then(d => { setItems(d); setLoading(false); });
  };

  useEffect(() => { load(); }, [entityKey]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ nombre: item.nombre, [extraField]: item[extraField] || "" });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    setSaving(true);
    const data = { nombre: editForm.nombre };
    if (extraField) data[extraField] = editForm[extraField];
    if (extraField2) data[extraField2] = editForm[extraField2];
    await base44.entities[entityKey].update(id, data);
    setSaving(false);
    setEditingId(null);
    load();
  };

  const toggleActivo = async (item) => {
    await base44.entities[entityKey].update(item.id, { activo: !item.activo });
    load();
  };

  const handleAdd = async () => {
    if (!newForm.nombre.trim()) return;
    setSaving(true);
    const data = { nombre: newForm.nombre.trim(), activo: true };
    if (extraField) data[extraField] = newForm[extraField] || "";
    if (extraField2) data[extraField2] = newForm[extraField2] || "";
    await base44.entities[entityKey].create(data);
    setNewForm({ nombre: "", ...(extraField ? { [extraField]: "" } : {}), ...(extraField2 ? { [extraField2]: "" } : {}) });
    setAdding(false);
    setSaving(false);
    load();
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
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="Desactivar">
                            <PowerOff className="h-3.5 w-3.5" />
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
                    <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Reactivar">
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState("Solicitante");
  const { user } = useAuth();
  const { espacioActivo } = useEspacio();
  const isAdmin = isAdminGlobal(user);
  const tab = TABS.find(t => t.key === activeTab);
  const isNotifTab = activeTab === "notificaciones";

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

      {activeTab === "notificaciones" ? (
        <NotificacionesTab />
      ) : activeTab === "espacios" ? (
        <EspaciosTab user={user} />
      ) : (
        <CatalogoTab
          key={activeTab}
          entityKey={tab.key}
          extraField={tab.extra}
          extraLabel={tab.extraLabel}
          extraField2={tab.extra2}
          extraLabel2={tab.extraLabel2}
        />
      )}
    </div>
  );
}