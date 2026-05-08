import { cn } from "@/lib/utils";

const priorityStyles = {
  "Alta": "bg-red-50 text-red-700 border-red-200",
  "Media": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Baja": "bg-gray-50 text-gray-600 border-gray-200",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
      priorityStyles[priority] || "bg-muted text-muted-foreground border-border"
    )}>
      {priority}
    </span>
  );
}