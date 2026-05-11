import { cn } from "@/lib/utils";

const statusStyles = {
  "Nuevo": "text-slate-700 bg-slate-50 border-slate-200",
  "Por priorizar": "text-slate-600 bg-slate-50 border-slate-200",
  "Asignado": "text-primary bg-accent border-accent-foreground/20",
  "En curso": "text-primary bg-accent border-accent-foreground/20",
  "Bloqueado": "text-warning bg-warning/10 border-warning/30",
  "En revisión": "text-primary bg-accent border-accent-foreground/20",
  "Cerrado": "text-success bg-success/20 border-success/30",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
      statusStyles[status] || "text-slate-500 bg-slate-50 border-slate-200"
    )}>
      {status}
    </span>
  );
}