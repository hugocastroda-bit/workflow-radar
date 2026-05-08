import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

const SEDES = ["Clínica Delgado", "Clínica Bellavista", "OncoCenter", "Cantella", "Medicina Nuclear", "Asistencia Médica", "Corporativo", "Otro"];
const PROCESOS = ["Selección", "Bienestar", "SST", "Clima", "Liderazgo", "ACI", "Onboarding", "Comunicaciones internas", "Legal laboral", "Compensaciones", "Gestión de talento", "Otros"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];

const emptyForm = {
  titulo: "", descripcion: "", solicitante: "", sede: "", proceso: "",
  prioridad: "", fecha_requerida: "", responsable: "", estado: "Nuevo",
  proxima_accion: "", motivo_bloqueo: "", comentarios_avance: "",
  link_evidencia: "", resultado_final: "", comentario_cierre: "", fecha_cierre_real: "",
};

export default function PedidoForm({ open, onClose, pedido, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pedido) {
      setForm({ ...emptyForm, ...pedido });
    } else {
      setForm(emptyForm);
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
    if (pedido?.id) {
      await base44.entities.Pedido.update(pedido.id, data);
    } else {
      data.estado = "Nuevo";
      await base44.entities.Pedido.create(data);
    }
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {pedido ? "Editar pedido" : "Nuevo pedido"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Título *</Label>
              <Input value={form.titulo} onChange={e => handleChange("titulo", e.target.value)} placeholder="Título del pedido" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => handleChange("descripcion", e.target.value)} placeholder="Descripción del pedido" className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Solicitante *</Label>
                <Input value={form.solicitante} onChange={e => handleChange("solicitante", e.target.value)} placeholder="Nombre del solicitante" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Responsable</Label>
                <Input value={form.responsable} onChange={e => handleChange("responsable", e.target.value)} placeholder="Responsable asignado" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Sede *</Label>
                <Select value={form.sede} onValueChange={v => handleChange("sede", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Proceso *</Label>
                <Select value={form.proceso} onValueChange={v => handleChange("proceso", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Prioridad *</Label>
                <Select value={form.prioridad} onValueChange={v => handleChange("prioridad", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fecha requerida *</Label>
                <Input type="date" value={form.fecha_requerida} onChange={e => handleChange("fecha_requerida", e.target.value)} className="mt-1" />
              </div>
              {pedido && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                  <Select value={form.estado} onValueChange={v => handleChange("estado", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Tracking */}
          {pedido && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seguimiento</p>
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

          {/* Close */}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.titulo || !form.solicitante || !form.sede || !form.proceso || !form.prioridad || !form.fecha_requerida}>
              {saving ? "Guardando..." : pedido ? "Guardar cambios" : "Crear pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}