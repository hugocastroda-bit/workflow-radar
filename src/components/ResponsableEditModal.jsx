import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { invalidateCatalogCache } from "@/components/PedidoForm";

export default function ResponsableEditModal({ open, onClose, responsable, onSaved }) {
  const [form, setForm] = useState({
    nombre: "",
    rol_funcion: "",
    email: "",
    activo: true,
    recibe_notificaciones: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Load responsable data when modal opens
  useEffect(() => {
    if (open && responsable) {
      setForm({
        nombre: responsable.nombre || "",
        rol_funcion: responsable.rol_funcion || "",
        email: responsable.email || "",
        activo: responsable.activo !== false,
        recibe_notificaciones: responsable.recibe_notificaciones !== false,
      });
      setErrors({});
    }
  }, [open, responsable]);

  const validateForm = async () => {
    const newErrors = {};

    // Nombre obligatorio
    if (!form.nombre || !form.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    }

    // Correo obligatorio y validar formato
    if (!form.email || !form.email.trim()) {
      newErrors.email = "El correo es obligatorio.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "El correo no tiene un formato válido.";
      } else {
        // Validar correo único (excluyendo el responsable actual)
        const normalized = form.email.toLowerCase().trim();
        const existentes = await base44.entities.Responsable.filter({})
          .catch(() => []);
        if (existentes.some(r =>
          r.id !== responsable.id &&
          (r.email || "").toLowerCase().trim() === normalized
        )) {
          newErrors.email = "Este correo ya está registrado y no puede repetirse.";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setSaving(true);
    try {
      const updateData = {
        nombre: form.nombre.trim(),
        rol_funcion: form.rol_funcion || "",
        email: form.email.toLowerCase().trim(),
        activo: form.activo,
        recibe_notificaciones: form.recibe_notificaciones,
      };

      console.log("[ResponsableEditModal] Updating responsable:", {
        id: responsable.id,
        data: updateData,
      });

      // UPDATE sobre el mismo ID, no crear nuevo
      const updated = await base44.entities.Responsable.update(
        responsable.id,
        updateData
      );

      console.log("[ResponsableEditModal] Update success:", updated);
      
      toast.success("Responsable actualizado correctamente.");
      invalidateCatalogCache();
      onSaved?.(updated);
      onClose();
    } catch (err) {
      console.error("[ResponsableEditModal] Error saving:", err);
      toast.error(
        err.message || "No se pudieron guardar los cambios. Inténtalo nuevamente."
      );
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({
      nombre: "",
      rol_funcion: "",
      email: "",
      activo: true,
      recibe_notificaciones: true,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Editar responsable
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Nombre */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Nombre *
            </Label>
            <Input
              value={form.nombre}
              onChange={(e) => {
                setForm((f) => ({ ...f, nombre: e.target.value }));
                setErrors((err) => ({ ...err, nombre: undefined }));
              }}
              placeholder="Nombre del responsable"
              className="mt-1"
              disabled={saving}
            />
            {errors.nombre && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-alert">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.nombre}
              </div>
            )}
          </div>

          {/* Rol / función */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Rol / función
            </Label>
            <Input
              value={form.rol_funcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, rol_funcion: e.target.value }))
              }
              placeholder="Ej. Analista HRBP"
              className="mt-1"
              disabled={saving}
            />
          </div>

          {/* Correo */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Correo *
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                setErrors((err) => ({ ...err, email: undefined }));
              }}
              placeholder="correo@empresa.com"
              className="mt-1"
              disabled={saving}
            />
            {errors.email && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-alert">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Estado
            </Label>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.activo === true}
                  onChange={() =>
                    setForm((f) => ({ ...f, activo: true }))
                  }
                  disabled={saving}
                  className="h-4 w-4"
                />
                <span className="text-xs text-foreground">Activo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.activo === false}
                  onChange={() =>
                    setForm((f) => ({ ...f, activo: false }))
                  }
                  disabled={saving}
                  className="h-4 w-4"
                />
                <span className="text-xs text-foreground">Inactivo</span>
              </label>
            </div>
          </div>

          {/* Notificaciones */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Notificaciones por correo
            </Label>
            <div className="flex items-center justify-between mt-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40">
              <span className="text-xs text-foreground">
                {form.recibe_notificaciones ? "Activas — recibirá alertas de pedidos" : "Desactivadas — no recibirá correos"}
              </span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, recibe_notificaciones: !f.recibe_notificaciones }))}
                disabled={saving}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.recibe_notificaciones ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  form.recibe_notificaciones ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}