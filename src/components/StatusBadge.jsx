import { cn } from "@/lib/utils";

const statusStyles = {
  "Nuevo": "text-slate-600 bg-slate-50 border-slate-200",
  "Por priorizar": "text-slate-500 bg-slate-50 border-slate-200",
  "Asignado": "text-blue-700 bg-blue-50 border-blue-100",
  "En curso": "text-sky-700 bg-sky-50 border-sky-100",
  "Bloqueado": "text-amber-700 bg-amber-50 border-amber-200",
  "En revisión": "text-violet-700 bg-violet-50 border-violet-100",
  "Cerrado": "text-emerald-700 bg-emerald-50 border-emerald-200",
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