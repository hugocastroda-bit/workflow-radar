import { cn } from "@/lib/utils";
import { Circle, Clock, UserCheck, Play, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

const statusConfig = {
  "Nuevo":         { style: "text-slate-700 bg-slate-50 border-slate-200 dark:text-[#00A3FF] dark:bg-[#002244] dark:border-[#00A3FF]/30",   icon: Circle },
  "Por priorizar": { style: "text-slate-600 bg-slate-50 border-slate-200 dark:text-[#9AA2B7] dark:bg-[#1A1C23] dark:border-[#22263F]",       icon: Clock },
  "Asignado":      { style: "text-primary bg-accent border-accent-foreground/20 dark:text-[#00E5FF] dark:bg-[#002B3D] dark:border-[#00E5FF]/30", icon: UserCheck },
  "En curso":      { style: "text-primary bg-accent border-accent-foreground/20 dark:text-[#39FF14] dark:bg-[#092D1A] dark:border-[#39FF14]/30", icon: Play },
  "Bloqueado":     { style: "text-warning bg-warning/10 border-warning/30 dark:text-[#FF9F00] dark:bg-[#331B00] dark:border-[#FF9F00]/30",     icon: AlertTriangle },
  "En revisión":   { style: "text-primary bg-accent border-accent-foreground/20 dark:text-[#D147FF] dark:bg-[#20003B] dark:border-[#D147FF]/30", icon: Eye },
  "Cerrado":       { style: "text-success bg-success/20 border-success/30 dark:text-[#00FF87] dark:bg-[#052E16] dark:border-[#00FF87]/30",     icon: CheckCircle2 },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status];
  const Icon = config?.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
      config?.style || "text-slate-500 bg-slate-50 border-slate-200"
    )}
      aria-label={`Estado: ${status}`}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
      {status}
    </span>
  );
}