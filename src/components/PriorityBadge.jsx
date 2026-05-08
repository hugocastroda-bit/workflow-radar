import { cn } from "@/lib/utils";

const priorityStyles = {
  "Alta": "text-red-700 bg-red-50 border-red-200",
  "Media": "text-yellow-700 bg-yellow-50 border-yellow-200",
  "Baja": "text-slate-500 bg-slate-50 border-slate-200",
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