import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Building2, Pencil, Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import EmpresaMembersDialog from "@/components/EmpresaMembersDialog";

const PLANES = ["Basic", "Team", "Pro", "Business"];
const ESTADOS = ["Activa", "Suspendida", "Prueba"];

const ESTADO_COLORS = {
  Activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Suspendida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Prueba: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const PLAN_COLORS = {
  Basic: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Team: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Business: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const EMPTY_FORM = {
  nombreEmpresa: "",
  ruc: "",
  plan: "Basic",
  estado: "Prueba",
  limiteUsuarios: 5,
  creditosMensuales: 5,
  fechaInicio: "",
  fechaFinPrueba: "",
};

export default function EmpresasTab() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [membersEmpresa, setMembersEmpresa] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Empresa.list();
      setEmpresas(data);
    } catch (e) {
      console.warn("Error loading empresas:", e);
      toast.error("No se pudieron cargar las empresas.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setForm({
      nombreEmpresa: emp.nombreEmpresa || "",
      ruc: emp.ruc || "",
      plan: emp.plan || "Basic",
      estado: emp.estado || "Prueba",
      limiteUsuarios: emp.limiteUsuarios ?? 5,
      creditosMensuales: emp.creditosMensuales ?? 5,
      fechaInicio: emp.fechaInicio || "",
      fechaFinPrueba: emp.fechaFinPrueba || "",
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombreEmpresa.trim()) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombreEmpresa: form.nombreEmpresa.trim(),
        ruc: form.ruc.trim() || undefined,
        plan: form.plan,
        estado: form.estado,
        limiteUsuarios: Number(form.limiteUsuarios) || 5,
        creditosMensuales: Number(form.creditosMensuales) || 5,
        fechaInicio: form.fechaInicio || undefined,
        fechaFinPrueba: form.fechaFinPrueba || undefined,
      };
      if (editingId) {
        await base44.entities.Empresa.update(editingId, payload);
        toast.success("Empresa actualizada.");
      } else {
        await base44.entities.Empresa.create(payload);
        toast.success("Empresa creada.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar la empresa.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Empresas registradas</p>
          <p className="text-xs text-muted-foreground mt-0.5">Crea y administra las empresas de la plataforma</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nueva empresa
        </Button>
      </div>

      {empresas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay empresas registradas</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Crea la primera empresa con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">RUC</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Límite usuarios</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(emp => (
                <tr key={emp.id} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{emp.nombreEmpresa}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{emp.ruc || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[emp.plan] || "bg-secondary text-muted-foreground"}`}>
                      {emp.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[emp.estado] || "bg-secondary text-muted-foreground"}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{emp.limiteUsuarios ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setMembersEmpresa(emp)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Asignar usuarios">
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(emp)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-primary" />
              {editingId ? "Editar empresa" : "Nueva empresa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre de la empresa *</Label>
              <Input value={form.nombreEmpresa}
                onChange={e => setForm(f => ({ ...f, nombreEmpresa: e.target.value }))}
                placeholder="Mi Empresa S.A."
                className="h-9 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">RUC</Label>
                <Input value={form.ruc}
                  onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))}
                  placeholder="20123456789"
                  className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANES.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Límite de usuarios</Label>
                <Input type="number" min="1" value={form.limiteUsuarios}
                  onChange={e => setForm(f => ({ ...f, limiteUsuarios: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Créditos mensuales</Label>
              <Input type="number" min="0" value={form.creditosMensuales}
                onChange={e => setForm(f => ({ ...f, creditosMensuales: e.target.value }))}
                className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input type="date" value={form.fechaInicio}
                  onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fin de prueba</Label>
                <Input type="date" value={form.fechaFinPrueba}
                  onChange={e => setForm(f => ({ ...f, fechaFinPrueba: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingId ? "Guardar cambios" : "Crear empresa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EmpresaMembersDialog
        empresa={membersEmpresa}
        open={!!membersEmpresa}
        onClose={() => setMembersEmpresa(null)}
      />
    </div>
  );
}