import { cn } from "@/lib/utils";

const priorityStyles = {
  "Alta": "text-alert bg-alert/10 border-alert/30",
  "Media": "text-yellow bg-yellow/10 border-yellow/30",
  "Baja": "text-slate-600 bg-slate-50 border-slate-200",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
      priorityStyles[priority] || "text-slate-500 bg-slate-50 border-slate-200"
    )}>
      {priority}
    </span>
  );
}