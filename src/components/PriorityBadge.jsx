import { cn } from "@/lib/utils";

const priorityStyles = {
  "Alta":  "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]",
  "Media": "bg-[#FFF7ED] text-[#F59E0B] border-[#FED7AA]",
  "Baja":  "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]",
};

export default function PriorityBadge({ priority, size = "sm" }) {
  const isXs = size === "xs";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium border",
      isXs ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-xs",
      priorityStyles[priority] || "bg-muted text-muted-foreground border-border"
    )}>
      {priority}
    </span>
  );
}