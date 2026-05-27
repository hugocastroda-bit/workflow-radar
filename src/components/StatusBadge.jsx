import { cn } from "@/lib/utils";

const statusStyles = {
  "Nuevo":        "text-slate-700 bg-slate-50 border-slate-200 dark:text-[#00A3FF] dark:bg-[#002244] dark:border-[#00A3FF]/30",
  "Por priorizar":"text-slate-600 bg-slate-50 border-slate-200 dark:text-[#9AA2B7] dark:bg-[#1A1C23] dark:border-[#22263F]",
  "Asignado":     "text-primary bg-accent border-accent-foreground/20 dark:text-[#00E5FF] dark:bg-[#002B3D] dark:border-[#00E5FF]/30",
  "En curso":     "text-primary bg-accent border-accent-foreground/20 dark:text-[#39FF14] dark:bg-[#092D1A] dark:border-[#39FF14]/30",
  "Bloqueado":    "text-warning bg-warning/10 border-warning/30 dark:text-[#FF9F00] dark:bg-[#331B00] dark:border-[#FF9F00]/30",
  "En revisión":  "text-primary bg-accent border-accent-foreground/20 dark:text-[#D147FF] dark:bg-[#20003B] dark:border-[#D147FF]/30",
  "Cerrado":      "text-success bg-success/20 border-success/30 dark:text-[#00FF87] dark:bg-[#052E16] dark:border-[#00FF87]/30",
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