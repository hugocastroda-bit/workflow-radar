import { useEffect, useState } from "react";
import { Building2, Check, Loader2, Pencil, Plus, ShieldAlert, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EmpresaMembersDialog from "@/components/EmpresaMembersDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { isGlobalAdmin } from "@/lib/roles";
import { toast } from "sonner";

const PLANES = ["Basic", "Team", "Pro", "Business"];
const ESTADOS = ["Activa", "Suspendida", "Prueba"];

const EMPTY_FORM = {
  nombreEmpresa: "DesignLab1",
  ruc: "",
  plan: "Basic",
  estado: "Activa",
  limiteUsuarios: 5,
  creditosMensuales: 5,
  fechaInicio: "",
  fechaFinPrueba: "",
};

export default function OwnerAdmin() {
  const { user, setEmpresaActiva } = useAuth();
  const allowed = isGlobalAdmin(user);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canCreateInitial, setCanCreateInitial] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [membersEmpresa, setMembersEmpresa] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke("ownerCompanyAdmin", { action: "list" });
      const data = result?.data || result || {};
      const loadedEmpresas = data.empresas || [];
      setEmpresas(loadedEmpresas);
      setCanCreateInitial(!!data.canCreateInitial);
      setAccessDenied(false);
      if (data.canCreateInitial && loadedEmpresas.length === 0) {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(true);
      }
    } catch (err) {
      console.error(err);
      setAccessDenied(true);
      toast.error("No tienes permisos para administrar empresas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [allowed]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (empresa) => {
    setForm({
      nombreEmpresa: empresa.nombreEmpresa || "",
      ruc: empresa.ruc || "",
      plan: empresa.plan || "Basic",
      estado: empresa.estado || "Prueba",
      limiteUsuarios: empresa.limiteUsuarios ?? 5,
      creditosMensuales: empresa.creditosMensuales ?? 5,
      fechaInicio: empresa.fechaInicio || "",
      fechaFinPrueba: empresa.fechaFinPrueba || "",
    });
    setEditingId(empresa.id);
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
      const result = await base44.functions.invoke("ownerCompanyAdmin", {
        action: editingId ? "update" : "create",
        empresaId: editingId || undefined,
        ...form,
      });
      const data = result?.data || result || {};
      if (!editingId && data.empresa?.id) {
        await setEmpresaActiva(data.empresa.id, "Admin");
      }
      toast.success(editingId ? "Empresa actualizada." : "Empresa creada.");
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar la empresa.");
    } finally {
      setSaving(false);
    }
  };

  if (accessDenied && !allowed && !canCreateInitial) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="border border-border rounded-xl p-6 text-center bg-card">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground mt-1">Esta página está disponible solo para Owner.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Administrar empresas</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {canCreateInitial ? "Crea DesignLab1 como primera empresa." : "Administra empresas, usuarios y roles."}
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nueva empresa
        </Button>
      </div>

      {empresas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tienes empresas asignadas.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Usuarios</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{empresa.nombreEmpresa}</p>
                    <p className="text-[11px] text-muted-foreground">{empresa.id}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{empresa.plan}</td>
                  <td className="px-4 py-3 text-muted-foreground">{empresa.estado}</td>
                  <td className="px-4 py-3 text-muted-foreground">{empresa.limiteUsuarios ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setMembersEmpresa(empresa)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Usuarios y roles"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(empresa)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar empresa"
                      >
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
              <Input value={form.nombreEmpresa} onChange={(e) => setForm((f) => ({ ...f, nombreEmpresa: e.target.value }))} className="h-9 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">RUC</Label>
                <Input value={form.ruc} onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANES.map((plan) => <SelectItem key={plan} value={plan} className="text-sm">{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((estado) => <SelectItem key={estado} value={estado} className="text-sm">{estado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Límite de usuarios</Label>
                <Input type="number" min="1" value={form.limiteUsuarios} onChange={(e) => setForm((f) => ({ ...f, limiteUsuarios: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Créditos mensuales</Label>
              <Input type="number" min="0" value={form.creditosMensuales} onChange={(e) => setForm((f) => ({ ...f, creditosMensuales: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fin de prueba</Label>
                <Input type="date" value={form.fechaFinPrueba} onChange={(e) => setForm((f) => ({ ...f, fechaFinPrueba: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingId ? "Guardar cambios" : "Crear empresa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EmpresaMembersDialog empresa={membersEmpresa} open={!!membersEmpresa} onClose={() => setMembersEmpresa(null)} />
    </div>
  );
}