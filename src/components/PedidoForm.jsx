import { useState, useEffect, useRef } from "react";
import { obtenerResponsablesActivos } from "@/lib/sync-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ChevronDown, Search, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Module-level cache
const catalogCache = {};

export function invalidateCatalogCache() {
  Object.keys(catalogCache).forEach(k => delete catalogCache[k]);
}

async function loadCatalogs() {
  if (!catalogCache.data) catalogCache.data = {};
  const cache = catalogCache.data;
  const f = { activo: true };
  
  if (!cache.solicitantes) {
    cache.solicitantes = await base44.entities.Solicitante.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Solicitantes:", e); return []; });
  }
  if (!cache.responsables) {
    cache.responsables = await obtenerResponsablesActivos()
      .catch(e => { console.warn("[PedidoForm] Error loading Responsables:", e); return []; });
  }
  if (!cache.procesos) {
    cache.procesos = await base44.entities.Proceso.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Procesos:", e); return []; });
  }
  if (!cache.prioridades) {
    cache.prioridades = await base44.entities.Prioridad.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Prioridades:", e); return []; });
  }
  return cache;
}

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

const emptyForm = {
  titulo: "", descripcion: "", solicitante: "", proceso: "",
  prioridad: "", fecha_requerida: "", responsable: "", estado: "Nuevo",
  proxima_accion: "", motivo_bloqueo: "", comentarios_avance: "",
  link_evidencia: "", resultado_final: "", comentario_cierre: "", fecha_cierre_real: "",
};

function SearchableSelect({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const display = value || "";

  return (
    <div ref={ref} className="relative">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && " *"}
      </Label>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={display ? "text-foreground" : "text-muted-foreground"}>
          {display || placeholder}
        </span>
        {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md">
          <div className="flex items-center border-b px-2 py-1.5 gap-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {!required && value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-left rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              >
                — Sin asignar
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
            )}
            {filtered.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${value === o ? "bg-accent font-medium" : ""}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PedidoForm({ open, onClose, pedido, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState({});
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadCatalogs()
      .then(cache => setCatalogs({ ...cache }))
      .catch(e => { console.error("[PedidoForm] Failed to load catalogs:", e); setCatalogs({}); });
  }, [open]);

  useEffect(() => {
    if (open) {
      if (pedido) {
        setForm({ ...emptyForm, ...pedido });
        setShowOptional(true);
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setForm({ ...emptyForm, fecha_requerida: defaultDate.toISOString().split("T")[0] });
        setShowOptional(false);
      }
    }
  }, [pedido, open]);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "estado" && value === "Cerrado" && !prev.fecha_cierre_real) {
        updated.fecha_cierre_real = new Date().toISOString().split("T")[0];
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form };

    if (!data.responsable) delete data.responsable;
    if (!data.fecha_requerida) delete data.fecha_requerida;
    if (!data.descripcion) delete data.descripcion;

    const timeout = setTimeout(() => {
      setSaving(false);
      toast.error("El guardado está tomando más tiempo de lo esperado. Revisa la conexión o intenta nuevamente.");
    }, 8000);

    try {
      let saved;
      if (pedido?.id) {
        saved = await base44.entities.Pedido.update(pedido.id, data);
      } else {
        data.estado = "Nuevo";
        saved = await base44.entities.Pedido.create(data);
      }
      clearTimeout(timeout);
      setSaving(false);
      if (!pedido) toast.success("Pedido creado correctamente");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      clearTimeout(timeout);
      setSaving(false);
      console.error("[PedidoForm] Error saving:", err);
      toast.error("No se pudo guardar el pedido. Inténtalo nuevamente.");
    }
  };

  const canSave = form.titulo && form.solicitante && form.proceso && form.prioridad;

  const solicitanteOpts = (catalogs.solicitantes || []).map(s => s.nombre);
  const responsableOpts = (catalogs.responsables || []).map(r => r.nombre);
  const procesoOpts = (catalogs.procesos || []).map(p => p.nombre);
  const prioridadOpts = (catalogs.prioridades || []).map(p => p.nombre);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {pedido ? "Editar pedido" : "Nuevo pedido"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Título *</Label>
              <Input
                autoFocus
                value={form.titulo}
                onChange={e => handleChange("titulo", e.target.value)}
                placeholder="¿Qué se necesita?"
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <SearchableSelect
                label="Solicitante" required
                value={form.solicitante} onChange={v => handleChange("solicitante", v)}
                options={solicitanteOpts} placeholder="Seleccionar"
              />
              <SearchableSelect
                label="Proceso" required
                value={form.proceso} onChange={v => handleChange("proceso", v)}
                options={procesoOpts} placeholder="Seleccionar"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Fecha requerida</Label>
              <Input
                type="date"
                value={form.fecha_requerida}
                onChange={e => handleChange("fecha_requerida", e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <SearchableSelect
                label="Prioridad" required
                value={form.prioridad} onChange={v => handleChange("prioridad", v)}
                options={prioridadOpts} placeholder="Seleccionar"
              />
              {pedido && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                  <SearchableSelect
                    label="" value={form.estado} onChange={v => handleChange("estado", v)}
                    options={ESTADOS} placeholder="Estado"
                  />
                </div>
              )}
            </div>
            {isAdmin && (
              <SearchableSelect
                label="Responsable"
                value={form.responsable} onChange={v => handleChange("responsable", v)}
                options={responsableOpts} placeholder="Sin asignar"
              />
            )}
          </div>

          {!pedido && (
            <button
              type="button"
              onClick={() => setShowOptional(o => !o)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showOptional ? "Ocultar detalles opcionales" : "Agregar más detalles (opcional)"}
            </button>
          )}

          {showOptional && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
                <Textarea
                  value={form.descripcion}
                  onChange={e => handleChange("descripcion", e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {pedido && isAdmin && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seguimiento</p>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
                <Textarea value={form.descripcion} onChange={e => handleChange("descripcion", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Próxima acción</Label>
                <Input value={form.proxima_accion} onChange={e => handleChange("proxima_accion", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Comentarios de avance</Label>
                <Textarea value={form.comentarios_avance} onChange={e => handleChange("comentarios_avance", e.target.value)} className="mt-1" rows={2} />
              </div>
              {form.estado === "Bloqueado" && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Motivo de bloqueo</Label>
                  <Textarea value={form.motivo_bloqueo} onChange={e => handleChange("motivo_bloqueo", e.target.value)} className="mt-1" rows={2} />
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Link o evidencia</Label>
                <Input value={form.link_evidencia} onChange={e => handleChange("link_evidencia", e.target.value)} className="mt-1" placeholder="https://..." />
              </div>
            </div>
          )}

          {pedido && form.estado === "Cerrado" && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cierre</p>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Resultado final</Label>
                <Textarea value={form.resultado_final} onChange={e => handleChange("resultado_final", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Comentario de cierre</Label>
                <Textarea value={form.comentario_cierre} onChange={e => handleChange("comentario_cierre", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fecha real de cierre</Label>
                <Input type="date" value={form.fecha_cierre_real} onChange={e => handleChange("fecha_cierre_real", e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? "Guardando..." : pedido ? "Guardar cambios" : "Crear pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}