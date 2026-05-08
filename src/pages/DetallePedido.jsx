import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { ArrowLeft, Pencil, Check, X, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const SEDES = ["Clínica Delgado", "Clínica Bellavista", "OncoCenter", "Cantella", "Medicina Nuclear", "Asistencia Médica", "Corporativo", "Otro"];
const PROCESOS = ["Selección", "Bienestar", "SST", "Clima", "Liderazgo", "ACI", "Onboarding", "Comunicaciones internas", "Legal laboral", "Compensaciones", "Gestión de talento", "Otros"];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-1">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${accent || "border-border"}`}>
      <div className="px-5 py-3 border-b border-border bg-slate-50/60">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPedido(); }, [id]);

  const loadPedido = async () => {
    const data = await base44.entities.Pedido.get(id);
    setPedido(data);
    setForm(data);
    setLoading(false);
  };

  const set = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    if (k === "estado" && v === "Cerrado" && !prev.fecha_cierre_real) {
      next.fecha_cierre_real = new Date().toISOString().split("T")[0];
    }
    return next;
  });

  const save = async () => {
    setSaving(true);
    await base44.entities.Pedido.update(id, form);
    await loadPedido();
    setEditing(false);
    setSaving(false);
  };

  const cancel = () => { setForm(pedido); setEditing(false); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!pedido) return (
    <div className="p-8 text-center text-muted-foreground">Pedido no encontrado</div>
  );

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isClosed = pedido.estado === "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";
  const cur = editing ? form : pedido;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <button onClick={() => navigate(-1)} className="mt-0.5 p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            {editing ? (
              <Input
                value={form.titulo}
                onChange={e => set("titulo", e.target.value)}
                className="text-base font-semibold h-8 px-2"
              />
            ) : (
              <h1 className="text-lg font-semibold text-foreground leading-snug">{pedido.titulo}</h1>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={pedido.estado} />
              <PriorityBadge priority={pedido.prioridad} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="h-3 w-3" /> Vencido
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancel} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </div>
      </div>

      {/* 1. Información general */}
      <Section title="Información general">
        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Textarea value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value)} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Solicitante</Label>
                <Input value={form.solicitante || ""} onChange={e => set("solicitante", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsable</Label>
                <Input value={form.responsable || ""} onChange={e => set("responsable", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sede</Label>
                <Select value={form.sede || ""} onValueChange={v => set("sede", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Proceso</Label>
                <Select value={form.proceso || ""} onValueChange={v => set("proceso", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prioridad</Label>
                <Select value={form.prioridad || ""} onValueChange={v => set("prioridad", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={form.estado || ""} onValueChange={v => set("estado", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha requerida</Label>
                <Input type="date" value={form.fecha_requerida || ""} onChange={e => set("fecha_requerida", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha real de cierre</Label>
                <Input type="date" value={form.fecha_cierre_real || ""} onChange={e => set("fecha_cierre_real", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {pedido.descripcion && (
              <div className="mb-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</p>
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{pedido.descripcion}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Solicitante" value={pedido.solicitante} />
              <Field label="Responsable" value={pedido.responsable} />
              <Field label="Sede" value={pedido.sede} />
              <Field label="Proceso" value={pedido.proceso} />
              <Field label="Prioridad" value={<PriorityBadge priority={pedido.prioridad} />} />
              <Field label="Estado" value={<StatusBadge status={pedido.estado} />} />
              <Field label="Fecha de creación" value={pedido.created_date?.split("T")[0]} />
              <Field label="Fecha requerida" value={
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>{pedido.fecha_requerida}</span>
              } />
              {pedido.fecha_cierre_real && <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />}
            </div>
          </>
        )}
      </Section>

      {/* 2. Seguimiento */}
      <Section title="Seguimiento">
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Comentarios de avance</Label>
              <Textarea value={form.comentarios_avance || ""} onChange={e => set("comentarios_avance", e.target.value)} rows={3} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Próxima acción</Label>
              <Input value={form.proxima_accion || ""} onChange={e => set("proxima_accion", e.target.value)} className="mt-1" />
            </div>
            {form.estado === "Bloqueado" && (
              <div>
                <Label className="text-xs text-muted-foreground">Motivo de bloqueo</Label>
                <Textarea value={form.motivo_bloqueo || ""} onChange={e => set("motivo_bloqueo", e.target.value)} rows={2} className="mt-1" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isBlocked && (
              <div className="border-l-4 border-amber-400 pl-4 py-1 mb-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Motivo de bloqueo</p>
                <p className="text-sm text-foreground mt-1">{pedido.motivo_bloqueo || "Sin especificar"}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Comentarios de avance" value={pedido.comentarios_avance} />
              <Field label="Próxima acción" value={pedido.proxima_accion} />
              <Field label="Última actualización" value={pedido.updated_date?.split("T")[0]} />
            </div>
          </div>
        )}
      </Section>

      {/* 3. Evidencias */}
      <Section title="Evidencias">
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Link relacionado</Label>
              <Input value={form.link_evidencia || ""} onChange={e => set("link_evidencia", e.target.value)} placeholder="https://…" className="mt-1" />
            </div>
          </div>
        ) : (
          <div>
            {pedido.link_evidencia ? (
              <a href={pedido.link_evidencia} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                {pedido.link_evidencia}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Sin evidencias registradas</p>
            )}
          </div>
        )}
      </Section>

      {/* 4. Cierre — only when closed or editing */}
      {(isClosed || (editing && form.estado === "Cerrado")) && (
        <Section title="Cierre" accent="border-emerald-200">
          {editing ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Resultado final</Label>
                <Textarea value={form.resultado_final || ""} onChange={e => set("resultado_final", e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Comentario de cierre</Label>
                <Textarea value={form.comentario_cierre || ""} onChange={e => set("comentario_cierre", e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha real de cierre</Label>
                <Input type="date" value={form.fecha_cierre_real || ""} onChange={e => set("fecha_cierre_real", e.target.value)} className="mt-1" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Resultado final" value={pedido.resultado_final} />
              <Field label="Comentario de cierre" value={pedido.comentario_cierre} />
              <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}