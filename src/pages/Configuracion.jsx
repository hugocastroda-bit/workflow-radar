import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Check, X, PowerOff, Power, ShieldOff, Building2, Trash2, AlertTriangle, Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { invalidateCatalogCache } from "@/components/PedidoForm";
import * as XLSX from "xlsx";

const BULK_CONFIG = {
  solicitantes: {
    entity: "Solicitante",
    cols: ["Nombre", "Correo", "Área / Cargo"],
    mapData: (row) => ({
      nombre: row["Nombre"],
      email: row["Correo"] || undefined,
      cargo_area: row["Área / Cargo"] || undefined,
      activo: true,
    }),
    example: [["Paola Montenegro", "paola@empresa.com", "Gestión Humana"]],
  },
  responsables: {
    entity: "Responsable",
    cols: ["Nombre", "Correo", "Rol / Función"],
    mapData: (row) => {
      const email = (row["Correo"] || "").toLowerCase().trim();
      return {
        nombre: row["Nombre"],
        email: email || undefined,
        correoNormalizado: email || undefined,
        rol_funcion: row["Rol / Función"] || undefined,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
      };
    },
    example: [["Gianella Pérez", "gianella@empresa.com", "Analista HRBP"]],
  },
  procesos: {
    entity: "Proceso",
    cols: ["Nombre"],
    mapData: (row) => ({
      nombre: row["Nombre"],
      activo: true,
    }),
    example: [["Selección"]],
  },
  prioridades: {
    entity: "Prioridad",
    cols: ["Nombre"],
    mapData: (row) => ({
      nombre: row["Nombre"],
      activo: true,
    }),
    example: [["Alta"]],
  },
};

const TABS = [
  { key: "Solicitante",  label: "Solicitantes",  extra: "cargo_area",  extraLabel: "Cargo o área",  extra2: "email", extraLabel2: "Correo", bulkType: "solicitantes" },
  { key: "Responsable",  label: "Responsables",  extra: "rol_funcion", extraLabel: "Rol o función", extra2: "email", extraLabel2: "Correo", bulkType: "responsables" },
  { key: "Proceso",      label: "Procesos",      extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null, bulkType: "procesos" },
  { key: "Prioridad",    label: "Prioridades",   extra: null,          extraLabel: null,            extra2: null,    extraLabel2: null, bulkType: "prioridades" },
  { key: "notificaciones", label: "Notificaciones", extra: null, extraLabel: null, extra2: null, extraLabel2: null, bulkType: null },
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

function CatalogoTab({ entityKey, extraField, extraLabel, extraField2, extraLabel2, onExtraAction, bulkType }) {
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
  const fileRef = useRef(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities[entityKey].filter({}, "nombre").then(d => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const downloadTemplate = () => {
    const cfg = BULK_CONFIG[bulkType];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cfg.cols, ...cfg.example]);
    XLSX.utils.book_append_sheet(wb, ws, entityKey);
    XLSX.writeFile(wb, `plantilla_${bulkType}.xlsx`);
  };

  const handleBulkFile = async (file) => {
    if (!file) return;
    setBulkResult(null);
    const cfg = BULK_CONFIG[bulkType];
    let existing = [];
    try {
      existing = await base44.entities[cfg.entity].list();
    } catch (e) {
      console.warn("Error fetching existing:", e);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed = data.map((rawRow, idx) => {
          const row = {};
          for (const col of cfg.cols) {
            row[col] = (rawRow[col] || "").toString().trim();
          }
          const errors = [];
          const warnings = [];
          
          if (!row["Nombre"]?.trim()) {
            errors.push("Falta nombre");
          }
          const isDup = existing.some(r => (r.nombre || "").toLowerCase().trim() === (row["Nombre"] || "").toLowerCase().trim());
          if (isDup) warnings.push("Duplicado");
          if (row["Correo"]?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Correo"])) {
            errors.push("Email inválido");
          }
          return { ...row, _idx: idx + 2, _errors: errors, _warnings: warnings, _skip: false };
        });
        setBulkRows(parsed);
      } catch (err) {
        toast.error("Error leyendo archivo");
        setBulkRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    const cfg = BULK_CONFIG[bulkType];
    const readyRows = bulkRows.filter(r => !r._skip && r._errors.length === 0);
    const toImport = readyRows.map(r => cfg.mapData(r));
    setBulkImporting(true);
    try {
      await base44.entities[cfg.entity].bulkCreate(toImport);
      const duplicates = bulkRows.filter(r => !r._skip && r._errors.length === 0 && r._warnings.length > 0).length;
      setBulkResult({
        total: bulkRows.length,
        imported: toImport.length,
        errors: bulkRows.filter(r => r._errors.length > 0).length,
        duplicates,
        skipped: bulkRows.filter(r => r._skip).length,
      });
      invalidateCatalogCache();
      load();
      toast.success("Carga masiva completada");
    } catch (err) {
      console.error(err);
      toast.error("Error importando");
    }
    setBulkImporting(false);
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
      // Validar correo único normalizado
      if (editForm.email) {
        const normalized = editForm.email.toLowerCase().trim();
        // Check in Responsable table
        const existingResp = await base44.entities.Responsable.filter({ correoNormalizado: normalized });
        if (existingResp.some(e => e.id !== id)) {
          toast.error("Este correo ya está registrado y no puede repetirse.");
          setSaving(false);
          return;
        }
        // Check in User table
        const existingUsers = await base44.entities.User.list();
        if (existingUsers.some(u => u.email?.toLowerCase().trim() === normalized)) {
          toast.error("Este correo ya está registrado y no puede repetirse.");
          setSaving(false);
          return;
        }
      }
      const data = { nombre: editForm.nombre.trim() };
      if (extraField) data[extraField] = editForm[extraField] || "";
      if (extraField2) {
        const normalized = (editForm[extraField2] || "").toLowerCase().trim();
        data[extraField2] = normalized;
        if (entityKey === "Responsable") data.correoNormalizado = normalized;
      }
      data.ultimaActualizacion = new Date().toISOString();
      await base44.entities[entityKey].update(id, data);
      setEditingId(null);
      invalidateCatalogCache();
      load();
    } catch { toast.error("No se pudo guardar. Inténtalo nuevamente."); }
    setSaving(false);
  };

  const toggleActivo = async (item) => {
    try {
      await base44.entities[entityKey].update(item.id, { activo: !item.activo });
      invalidateCatalogCache();
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
       pedidosAsociados = await base44.entities.Pedido.filter({ [campoPedido]: confirmDelete.nombre });
     }
      if (pedidosAsociados.length > 0) {
        setConfirmDelete(null);
        setBlockModal({ item: confirmDelete, message: "No se puede eliminar esta opción porque tiene información asociada. Puedes inactivarla para que no vuelva a aparecer en nuevos pedidos." });
      } else {
        await base44.entities[entityKey].delete(confirmDelete.id);
        toast.success("Opción eliminada correctamente.");
        setConfirmDelete(null);
        invalidateCatalogCache();
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
      invalidateCatalogCache();
      load();
    } catch { toast.error("No se pudo inactivar."); }
  };

  const handleAdd = async () => {
    if (!newForm.nombre.trim()) return;
    setSaving(true);
    try {
      // Validar correo único normalizado
      if (newForm.email) {
        const normalized = newForm.email.toLowerCase().trim();
        // Check in Responsable table
        const existingResp = await base44.entities.Responsable.filter({ correoNormalizado: normalized });
        if (existingResp.length > 0) {
          toast.error("Este correo ya está registrado y no puede repetirse.");
          setSaving(false);
          return;
        }
        // Check in User table
        const existingUsers = await base44.entities.User.list();
        if (existingUsers.some(u => u.email?.toLowerCase().trim() === normalized)) {
          toast.error("Este correo ya está registrado y no puede repetirse.");
          setSaving(false);
          return;
        }
      }
      const data = { nombre: newForm.nombre.trim(), activo: true };
      if (extraField) data[extraField] = newForm[extraField] || "";
      if (extraField2) {
        const normalized = (newForm[extraField2] || "").toLowerCase().trim();
        data[extraField2] = normalized;
        if (entityKey === "Responsable") data.correoNormalizado = normalized;
      }
      if (entityKey === "Responsable") {
        data.fechaCreacion = new Date().toISOString();
        data.ultimaActualizacion = new Date().toISOString();
      }
      await base44.entities[entityKey].create(data);
      setNewForm({ nombre: "", ...(extraField ? { [extraField]: "" } : {}), ...(extraField2 ? { [extraField2]: "" } : {}) });
      setAdding(false);
      invalidateCatalogCache();
      load();
    } catch { toast.error("No se pudo agregar. Intenta nuevamente."); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  const activos   = items.filter(i => i.activo !== false);
  const inactivos = items.filter(i => i.activo === false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setBulkRows([])} variant="outline" className="gap-1.5 text-xs">
          <Upload className="h-3.5 w-3.5" /> Carga masiva
        </Button>
        <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {bulkRows.length === 0 && !bulkResult && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Carga masiva de registros</p>
            <Button size="sm" variant="ghost" onClick={downloadTemplate} className="gap-1 text-xs h-7">
              <Download className="h-3 w-3" /> Plantilla
            </Button>
          </div>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/30 transition"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleBulkFile(e.dataTransfer.files[0]); }}
          >
            <Upload className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Sube Excel o CSV</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleBulkFile(e.target.files[0])} />
          </div>
        </div>
      )}

      {bulkRows.length > 0 && !bulkResult && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-foreground">{bulkRows.length} filas</p>
            <Button size="sm" variant="ghost" onClick={() => setBulkRows([])} className="text-xs h-7">Cancelar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">#</th>
                  {BULK_CONFIG[bulkType].cols.map(c => <th key={c} className="px-2 py-2 text-left font-medium text-muted-foreground">{c}</th>)}
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, i) => {
                  const hasErr = row._errors.length > 0;
                  const hasWarn = row._warnings.length > 0;
                  return (
                    <tr key={i} className={`border-b text-xs ${row._skip ? "opacity-40" : hasErr ? "bg-red-50/40" : hasWarn ? "bg-yellow-50/30" : ""}`}>
                      <td className="px-2 py-1 text-slate-400">{row._idx}</td>
                      {BULK_CONFIG[bulkType].cols.map(c => <td key={c} className="px-2 py-1 truncate max-w-[100px] text-slate-700">{row[c] || "—"}</td>)}
                      <td className="px-2 py-1">
                        {row._skip ? (
                          <span className="text-slate-400">Omitido</span>
                        ) : hasErr ? (
                          <span className="text-red-600 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Error</span>
                        ) : hasWarn ? (
                          <span className="text-amber-600 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Dup</span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {bulkRows.some(r => r._errors.length > 0 || r._warnings.length > 0) && (
            <div className="space-y-1 text-xs">
              {bulkRows.filter(r => (r._errors.length > 0 || r._warnings.length > 0) && !r._skip).map((row, i) => (
                <div key={i} className={`rounded px-2 py-1 ${row._errors.length > 0 ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                  <span className="font-medium">Fila {row._idx}:</span> {[...row._errors, ...row._warnings].join(" · ")}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkRows([])} className="text-xs h-7">Cancelar</Button>
            <Button size="sm" onClick={handleBulkImport} disabled={bulkImporting || bulkRows.filter(r => !r._skip && r._errors.length === 0).length === 0} className="text-xs h-7 gap-1">
              {bulkImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : `Importar (${bulkRows.filter(r => !r._skip && r._errors.length === 0).length})`}
            </Button>
          </div>
        </div>
      )}

      {bulkResult && (
        <div className="border border-success/30 rounded-lg p-4 bg-success/10 space-y-2">
          <div className="flex items-center gap-2 text-success font-medium text-sm">
            <CheckCircle className="h-4 w-4" /> Importación completada
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-6 list-disc">
            <li>Leídas: {bulkResult.total}</li>
            <li>Importadas: {bulkResult.imported}</li>
            <li>Duplicados: {bulkResult.duplicates}</li>
            <li>Errores: {bulkResult.errors}</li>
            <li>Omitidas: {bulkResult.skipped}</li>
          </ul>
          <Button size="sm" variant="outline" onClick={() => { setBulkResult(null); setBulkRows([]); }} className="text-xs h-7 mt-2">Cerrar</Button>
        </div>
      )}

      {adding && (
        <div className="border border-border rounded-lg p-4 bg-secondary/40 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nueva opción</p>
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
            <Button size="sm" onClick={handleAdd} disabled={saving || !newForm.nombre.trim()} className="text-xs h-7">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {/* Active items */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-2.5 bg-secondary border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activos ({activos.length})</span>
        </div>
        {activos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground text-center">Sin opciones activas</p>
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
                          <button onClick={() => saveEdit(item.id)} disabled={saving} className="p-1.5 rounded hover:bg-success/10 text-success transition-colors">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-2.5 font-medium text-foreground">{item.nombre}</td>
                      {extraField && <td className="px-4 py-2.5 text-muted-foreground text-xs">{item[extraField] || "—"}</td>}
                      {extraField2 && <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {item[extraField2] ? (
                          <div className="flex flex-col text-xs">
                            <span>{item[extraField2]}</span>
                            {item.usuarioId && <span className="text-slate-300 text-[10px]">vinculado</span>}
                          </div>
                        ) : (
                          <span className="text-warning">Sin correo</span>
                        )}
                      </td>}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {onExtraAction && (
                            <button onClick={() => onExtraAction(item)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Gestionar espacios">
                              <Building2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors" title="Desactivar">
                            <PowerOff className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteRequest(item)} className="p-1.5 rounded hover:bg-alert/10 text-muted-foreground hover:text-alert transition-colors" title="Eliminar">
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
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-2.5 bg-secondary border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Inactivos ({inactivos.length})</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {inactivos.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0 opacity-60">
                  <td className="px-5 py-2.5 text-muted-foreground line-through">{item.nombre}</td>
                  {extraField && <td className="px-4 py-2.5 text-muted-foreground text-xs">{item[extraField] || "—"}</td>}
                  {extraField2 && <td className="px-4 py-2.5 text-muted-foreground text-xs">{item[extraField2] || "—"}</td>}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleActivo(item)} className="p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success transition-colors" title="Reactivar">
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteRequest(item)} className="p-1.5 rounded hover:bg-alert/10 text-muted-foreground hover:text-alert transition-colors" title="Eliminar">
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
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Eliminar opción</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">¿Estás seguro de que deseas eliminar <strong>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer si no tiene información asociada.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleteLoading}>Cancelar</Button>
              <Button size="sm" onClick={handleDeleteConfirm} disabled={deleteLoading} className="bg-alert hover:bg-alert/90 text-white">
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
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> No se puede eliminar</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{blockModal.message}</p>
            <div className="flex justify-end gap-2 pt-1">
             <Button variant="outline" size="sm" onClick={() => setBlockModal(null)}>Cancelar</Button>
             <Button size="sm" onClick={handleInactivarDesdeBloqueo} className="bg-warning hover:bg-warning/90 text-white">Inactivar opción</Button>
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const tab = TABS.find(t => t.key === activeTab);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <ShieldOff className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No tienes permisos para acceder a esta sección.</p>
          <p className="text-xs text-muted-foreground">Solo los usuarios Admin pueden gestionar la configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="text-xs text-muted-foreground mt-1">Administra las listas maestras de los desplegables del formulario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>



      {activeTab === "notificaciones" ? (
        <NotificacionesTab />
      ) : (
        <CatalogoTab
           key={activeTab}
           entityKey={tab.key}
           extraField={tab.extra}
           extraLabel={tab.extraLabel}
           extraField2={tab.extra2}
           extraLabel2={tab.extraLabel2}
           onExtraAction={null}
           bulkType={tab.bulkType}
        />
      )}


    </div>
  );
}