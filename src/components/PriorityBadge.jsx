import { cn } from "@/lib/utils";

const priorityStyles = {
  "Alta": "text-alert bg-alert/10 border-alert/30",
  "Media": "text-yellow bg-yellow/10 border-yellow/30",
  "Baja": "text-slate-600 bg-slate-50 border-slate-200",
};

export default function PriorityBadge({ priority, size = "sm" }) {
  const isXs = size === "xs";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium border",
      isXs ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-xs",
      priorityStyles[priority] || "text-slate-500 bg-slate-50 border-slate-200"
    )}>
      {priority}
    </span>
  );
}