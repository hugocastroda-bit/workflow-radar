import { cn } from "@/lib/utils";
import { Circle, Clock, UserCheck, Play, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

const statusConfig = {
  "Nuevo":         { bg: "bg-status-nuevo/10",       text: "text-status-nuevo",       border: "border-status-nuevo/25",       icon: Circle },
  "Por priorizar": { bg: "bg-status-priorizar/10",    text: "text-status-priorizar",    border: "border-status-priorizar/25",    icon: Clock },
  "Asignado":      { bg: "bg-status-asignado/10",     text: "text-status-asignado",     border: "border-status-asignado/25",     icon: UserCheck },
  "En curso":      { bg: "bg-status-encurso/10",      text: "text-status-encurso",      border: "border-status-encurso/25",      icon: Play },
  "Bloqueado":     { bg: "bg-status-bloqueado/10",    text: "text-status-bloqueado",    border: "border-status-bloqueado/25",    icon: AlertTriangle },
  "En revisión":   { bg: "bg-status-revision/10",     text: "text-status-revision",     border: "border-status-revision/25",     icon: Eye },
  "Cerrado":       { bg: "bg-status-cerrado/10",      text: "text-status-cerrado",      border: "border-status-cerrado/25",      icon: CheckCircle2 },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status];
  const Icon = config?.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      config?.bg || "bg-muted",
      config?.text || "text-muted-foreground",
      config?.border || "border-border"
    )}
      aria-label={`Estado: ${status}`}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
      {status}
    </span>
  );
}