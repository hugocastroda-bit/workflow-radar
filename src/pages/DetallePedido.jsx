import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { ArrowLeft, Pencil, Check, X, ExternalLink, Loader2, AlertTriangle } from "lucide-react";

const ESTADOS = ["Nuevo", "Por priorizar", "Asignado", "En curso", "Bloqueado", "En revisión", "Cerrado"];
const SEDES = ["Clínica Delgado", "Clínica Bellavista", "OncoCenter", "Cantella", "Medicina Nuclear", "Asistencia Médica", "Corporativo", "Otro"];
const PROCESOS = ["Selección", "Bienestar", "SST", "Clima", "Liderazgo", "ACI", "Onboarding", "Comunicaciones internas", "Legal laboral", "Compensaciones", "Gestión de talento", "Otros"];
const PRIORIDADES = ["Alta", "Media", "Baja"];

function Field({ label, value, highlight, mono }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? "text-red-600 font-medium" : mono ? "font-mono" : "text-foreground"}`}>
        {value || <span className="text-muted-foreground/50">—</span>}
      </p>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-white border rounded-lg p-6 space-y-5 ${accent || "border-border"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${accent ? "text-emerald-600" : "text-muted-foreground"}`}>{title}</p>
      {children}
    </div>
  );
}

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState(null); // "general" | "seguimiento" | "cierre" | null
  const [draft, setDraft] = useState({});

  const load = async () => {
    const data = await base44.entities.Pedido.get(id);
    setPedido(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const startEdit = (section) => {
    setDraft({ ...pedido });
    setEditSection(section);
  };

  const cancelEdit = () => { setEditSection(null); setDraft({}); };

  const saveEdit = async () => {
    setSaving(true);
    const data = { ...draft };
    if (data.estado === "Cerrado" && !data.fecha_cierre_real) {
      data.fecha_cierre_real = new Date().toISOString().split("T")[0];
    }
    await base44.entities.Pedido.update(id, data);
    await load();
    setEditSection(null);
    setDraft({});
    setSaving(false);
  };

  const set = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!pedido) return <div className="p-8 text-sm text-muted-foreground">Pedido no encontrado</div>;

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = pedido.fecha_requerida < today && pedido.estado !== "Cerrado";
  const isBlocked = pedido.estado === "Bloqueado";
  const isClosed = pedido.estado === "Cerrado";

  const EditBar = ({ section }) => editSection === section ? (
    <div className="flex gap-2">
      <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5 h-7 text-xs">
        <Check className="h-3 w-3" /> {saving ? "Guardando…" : "Guardar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs gap-1">
        <X className="h-3 w-3" /> Cancelar
      </Button>
    </div>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => startEdit(section)} className="h-7 text-xs text-muted-foreground gap-1 -mr-1">
      <Pencil className="h-3 w-3" /> Editar
    </Button>
  );

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <button onClick={() => navigate(-1)} className="mt-0.5 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h1 className="text-lg font-semibold text-foreground">{pedido.titulo}</h1>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" /> Vencido
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={pedido.estado} />
              <PriorityBadge priority={pedido.prioridad} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 shrink-0">
          Actualizado {pedido.updated_date?.split("T")[0] || "—"}
        </p>
      </div>

      {/* Alerta bloqueo */}
      {isBlocked && pedido.motivo_bloqueo && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Pedido bloqueado</p>
            <p className="text-sm text-amber-800 mt-0.5">{pedido.motivo_bloqueo}</p>
          </div>
        </div>
      )}

      {/* 1. Información general */}
      <Section title="Información general">
        <div className="flex items-center justify-between">
          <div /> <EditBar section="general" />
        </div>

        {editSection === "general" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={draft.titulo || ""} onChange={e => set("titulo", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Textarea value={draft.descripcion || ""} onChange={e => set("descripcion", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Solicitante</Label>
                <Input value={draft.solicitante || ""} onChange={e => set("solicitante", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsable</Label>
                <Input value={draft.responsable || ""} onChange={e => set("responsable", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Sede</Label>
                <Select value={draft.sede} onValueChange={v => set("sede", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Proceso</Label>
                <Select value={draft.proceso} onValueChange={v => set("proceso", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROCESOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Prioridad</Label>
                <Select value={draft.prioridad} onValueChange={v => set("prioridad", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={draft.estado} onValueChange={v => set("estado", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha requerida</Label>
                <Input type="date" value={draft.fecha_requerida || ""} onChange={e => set("fecha_requerida", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <Field label="Solicitante" value={pedido.solicitante} />
              <Field label="Responsable" value={pedido.responsable} />
              <Field label="Sede" value={pedido.sede} />
              <Field label="Proceso" value={pedido.proceso} />
              <Field label="Fecha requerida" value={pedido.fecha_requerida} highlight={isOverdue} />
              <Field label="Fecha de creación" value={pedido.created_date?.split("T")[0]} />
            </div>
            {pedido.descripcion && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{pedido.descripcion}</p>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 2. Seguimiento */}
      <Section title="Seguimiento">
        <div className="flex items-center justify-between">
          <div /> <EditBar section="seguimiento" />
        </div>

        {editSection === "seguimiento" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Comentarios de avance</Label>
              <Textarea value={draft.comentarios_avance || ""} onChange={e => set("comentarios_avance", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Próxima acción</Label>
              <Input value={draft.proxima_accion || ""} onChange={e => set("proxima_accion", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Motivo de bloqueo</Label>
              <Textarea value={draft.motivo_bloqueo || ""} onChange={e => set("motivo_bloqueo", e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Comentarios de avance" value={pedido.comentarios_avance} />
            <Field label="Próxima acción" value={pedido.proxima_accion} />
            {isBlocked && (
              <Field label="Motivo de bloqueo" value={pedido.motivo_bloqueo} />
            )}
            <p className="text-xs text-muted-foreground">
              Última actualización: {pedido.updated_date?.split("T")[0] || "—"}
            </p>
          </div>
        )}
      </Section>

      {/* 3. Evidencias */}
      <Section title="Evidencias">
        <div className="flex items-center justify-between">
          <div /> <EditBar section="evidencias" />
        </div>

        {editSection === "evidencias" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Link relacionado</Label>
              <Input value={draft.link_evidencia || ""} onChange={e => set("link_evidencia", e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pedido.link_evidencia ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Link relacionado</p>
                <a href={pedido.link_evidencia} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline break-all">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {pedido.link_evidencia}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">Sin evidencias registradas</p>
            )}
          </div>
        )}
      </Section>

      {/* 4. Cierre (solo si aplica) */}
      {(isClosed || editSection === "cierre") && (
        <Section title="Cierre" accent="border-emerald-200">
          <div className="flex items-center justify-between">
            <div /> <EditBar section="cierre" />
          </div>

          {editSection === "cierre" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Resultado final</Label>
                <Textarea value={draft.resultado_final || ""} onChange={e => set("resultado_final", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Comentario de cierre</Label>
                <Textarea value={draft.comentario_cierre || ""} onChange={e => set("comentario_cierre", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha real de cierre</Label>
                <Input type="date" value={draft.fecha_cierre_real || ""} onChange={e => set("fecha_cierre_real", e.target.value)} className="mt-1" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Resultado final" value={pedido.resultado_final} />
              <Field label="Comentario de cierre" value={pedido.comentario_cierre} />
              <Field label="Fecha real de cierre" value={pedido.fecha_cierre_real} />
            </div>
          )}
        </Section>
      )}

      {/* Editar cierre si no está cerrado */}
      {!isClosed && editSection !== "cierre" && (
        <div className="text-center pt-1">
          <button onClick={() => startEdit("cierre")} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            Registrar cierre manualmente
          </button>
        </div>
      )}
    </div>
  );
}