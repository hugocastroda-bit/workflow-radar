import { cn } from "@/lib/utils";

const statusStyles = {
  "Nuevo": "bg-blue-50 text-blue-700 border-blue-200",
  "Por priorizar": "bg-slate-50 text-slate-700 border-slate-200",
  "Asignado": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "En curso": "bg-sky-50 text-sky-700 border-sky-200",
  "Bloqueado": "bg-amber-50 text-amber-700 border-amber-200",
  "En revisión": "bg-purple-50 text-purple-700 border-purple-200",
  "Cerrado": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
      statusStyles[status] || "bg-muted text-muted-foreground border-border"
    )}>
      {status}
    </span>
  );
}