import { useState, useEffect, useRef } from "react";
import { obtenerResponsablesActivos } from "@/lib/sync-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ChevronDown, Search, ChevronUp, Info } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "sonner";
import { subscribeToCacheChanges, getCachedData, setCachedData } from "@/lib/catalog-cache";
import { eventBus } from "@/lib/eventBus";

// Module-level cache
const catalogCache = {};

export function invalidateCatalogCache() {
  // Invalidar responsables en global cache system
  Object.keys(catalogCache).forEach(k => delete catalogCache[k]);
}

async function loadCatalogs(forceRefresh = false) {
  if (!catalogCache.data) catalogCache.data = {};
  const cache = catalogCache.data;
  const f = { activo: true };
  
  if (!cache.solicitantes || forceRefresh) {
    cache.solicitantes = await base44.entities.Solicitante.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Solicitantes:", e); return []; });
  }
  // SIEMPRE refrescar responsables: no usar caché, consultar BD directamente
  // Esto asegura que si se creó/editó un usuario, aparezca el responsable
  cache.responsables = await obtenerResponsablesActivos()
    .catch(e => { console.warn("[PedidoForm] Error loading Responsables:", e); return []; });
  if (!cache.procesos || forceRefresh) {
    cache.procesos = await base44.entities.Proceso.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Procesos:", e); return []; });
  }
  if (!cache.prioridades || forceRefresh) {
    cache.prioridades = await base44.entities.Prioridad.filter(f, "nombre")
      .catch(e => { console.warn("[PedidoForm] Error loading Prioridades:", e); return []; });
  }
  return cache;
}

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

const COMPLEJIDAD_MINUTOS = {
  "Alta|Simple": 30, "Alta|Media": 60, "Alta|Alta": 120,
  "Media|Simple": 15, "Media|Media": 45, "Media|Alta": 90,
  "Baja|Simple": 10, "Baja|Media": 30, "Baja|Alta": 60,
};

const emptyForm = {
  titulo: "", descripcion: "", solicitante: "", proceso: "",
  prioridad: "", complejidad: "", riesgo: "", fecha_requerida: "", responsable: "", estado: "Nuevo",
  proxima_accion: "", motivo_bloqueo: "", comentarios_avance: "",
  link_evidencia: "", resultado_final: "", comentario_cierre: "", fecha_cierre_real: "",
  confidencial: false,
  horasEstimadas: null, horasReales: null, fechaCompromiso: "",
};



export default function PedidoForm({ open, onClose, pedido, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState({});
  const [showOptional, setShowOptional] = useState(false);
  
  // Escuchar cambios de caché global para refrescar responsables
  useEffect(() => {
    const unsubscribe = subscribeToCacheChanges((changedType) => {
      if (!open) return;
      // Si cambió Responsable o todo el caché, refrescar
      if (changedType === 'all' || changedType === 'responsables') {
        loadCatalogs(false)
          .then(cache => setCatalogs({ ...cache }))
          .catch(e => console.warn('[PedidoForm] Error reloading catalogs:', e));
      }
    });
    return unsubscribe;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Forzar recarga de catalogs cada vez que se abre, especialmente Responsables
    loadCatalogs(false)
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
      // Auto-suggest horasEstimadas when priority or complejidad change
      if (field === "prioridad" || field === "complejidad") {
        const p = field === "prioridad" ? value : prev.prioridad;
        const c = field === "complejidad" ? value : prev.complejidad;
        if (p && c) {
          updated.horasEstimadas = COMPLEJIDAD_MINUTOS[`${p}|${c}`] ?? prev.horasEstimadas;
        }
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
    if (!data.complejidad) delete data.complejidad;
    if (!data.riesgo) delete data.riesgo;
    if (data.horasEstimadas == null) delete data.horasEstimadas;
    if (data.horasReales == null) delete data.horasReales;
    if (!data.fechaCompromiso) delete data.fechaCompromiso;

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
      if (!pedido) {
       toast.success("Pedido creado correctamente");
       eventBus.emit('pedidoCreado', saved);
      }
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
            <SearchableSelect
              label="Prioridad" required
              value={form.prioridad} onChange={v => handleChange("prioridad", v)}
              options={prioridadOpts} placeholder="Seleccionar"
            />
            {pedido && (
              <SearchableSelect
                label="Estado"
                value={form.estado} onChange={v => handleChange("estado", v)}
                options={ESTADOS} placeholder="Estado"
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
            <div className="space-y-3 border-t pt-4">
              <SearchableSelect
                label="Complejidad (opcional)"
                value={form.complejidad || ""} onChange={v => handleChange("complejidad", v)}
                options={["Simple", "Media", "Alta"]} placeholder="Sin definir"
              />
              <SearchableSelect
                label="Riesgo (opcional)"
                value={form.riesgo || ""} onChange={v => handleChange("riesgo", v || null)}
                options={["Bajo", "Medio", "Alto"]} placeholder="Sin definir"
              />
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Minutos estimados</Label>
                  {isAdmin ? (
                    <Input
                      type="number" step="5" min="0"
                      value={form.horasEstimadas != null ? form.horasEstimadas : ""}
                      onChange={e => handleChange("horasEstimadas", e.target.value === "" ? null : parseFloat(e.target.value))}
                      className="mt-1"
                      placeholder={form.prioridad && form.complejidad ? `${COMPLEJIDAD_MINUTOS[form.prioridad + "|" + form.complejidad] || "—"} min` : "Sin estimación"}
                    />
                  ) : (
                    <div className="mt-1 h-9 px-3 flex items-center rounded-lg border border-input bg-muted/40 text-sm text-muted-foreground">
                      {form.horasEstimadas != null ? `${form.horasEstimadas} min` :
                       form.prioridad && form.complejidad ? `${COMPLEJIDAD_MINUTOS[form.prioridad + "|" + form.complejidad] || "—"} min (sugerido)` :
                       "Sin estimación"}
                    </div>
                  )}
                </div>
                {isAdmin ? (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Fecha compromiso <span className="text-muted-foreground/50 font-normal">(opcional)</span></Label>
                    <Input
                      type="date"
                      value={form.fechaCompromiso || ""}
                      onChange={e => handleChange("fechaCompromiso", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ) : form.fechaCompromiso ? (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Fecha compromiso</Label>
                    <div className="mt-1 h-9 px-3 flex items-center rounded-lg border border-input bg-muted/40 text-sm text-muted-foreground">
                      {form.fechaCompromiso}
                    </div>
                  </div>
                ) : null}
              </div>
              {!pedido && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confidencial"
                    checked={!!form.confidencial}
                    onChange={e => handleChange("confidencial", e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <label htmlFor="confidencial" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Pedido confidencial
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-medium mb-1.5">Visible únicamente para:</p>
                      <ul className="space-y-0.5 text-muted-foreground">
                        <li>• Admin</li>
                        <li>• Creador</li>
                        <li>• Responsable</li>
                        <li>• Solicitante</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              {isAdmin && (
                <SearchableSelect
                  label="Responsable (opcional)"
                  value={form.responsable} onChange={v => handleChange("responsable", v)}
                  options={responsableOpts} placeholder="Sin asignar"
                />
              )}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-muted-foreground/50 font-normal">(opcional)</span></Label>
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