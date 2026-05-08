import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function ConfirmDeleteModal({ open, onClose, onConfirm, deleting }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-red-500" /> Borrar pedido
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 mt-1">
          ¿Estás seguro de que deseas borrar este pedido? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>Cancelar</Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Borrando..." : "Sí, borrar pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}