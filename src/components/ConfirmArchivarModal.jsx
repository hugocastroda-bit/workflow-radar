import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Archive } from "lucide-react";

export default function ConfirmArchivarModal({ open, onClose, onConfirm, archiving }) {
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
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Archive className="h-4 w-4 text-slate-500" /> Archivar pedido
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 leading-relaxed">
          ¿Estás seguro de que deseas archivar este pedido? El pedido dejará de aparecer en la Bandeja, Kanban y Dashboard, pero podrás consultarlo desde Archivados.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Motivo de archivo (opcional)</Label>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Pedido duplicado, solicitud cancelada..."
            rows={2}
            className="text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={archiving}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={archiving}
            className="bg-slate-700 hover:bg-slate-600 text-white">
            {archiving ? "Archivando…" : "Sí, archivar pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}