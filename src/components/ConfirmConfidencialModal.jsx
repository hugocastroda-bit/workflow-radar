import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, LockOpen } from "lucide-react";

export default function ConfirmConfidencialModal({ open, onClose, onConfirm, marcar, saving }) {
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    onConfirm(motivo);
    setMotivo("");
  };

  const handleClose = () => {
    setMotivo("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            {marcar ? <Lock className="h-4 w-4 text-primary" /> : <LockOpen className="h-4 w-4 text-muted-foreground" />}
            {marcar ? "Marcar como confidencial" : "Quitar confidencialidad"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
         {marcar
           ? "¿Deseas marcar este pedido como confidencial? Solo será visible para Admin, solicitante, responsable y creador del pedido."
           : "¿Deseas quitar la confidencialidad de este pedido? El pedido volverá a ser visible según las reglas generales de la aplicación."}
        </p>
        {marcar && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-1">Motivo (opcional)</p>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Información sensible de RRHH..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
            className={marcar ? "bg-primary hover:bg-primary/90 text-white" : "bg-foreground/80 hover:bg-foreground text-card"}
          >
            {saving ? "Guardando…" : marcar ? "Sí, marcar como confidencial" : "Sí, quitar confidencialidad"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}