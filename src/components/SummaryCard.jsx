import { cn } from "@/lib/utils";

export default function SummaryCard({ title, value, icon: Icon, variant = "default", onClick }) {
  const variants = {
    default: "border-border",
    danger: "border-red-200 bg-red-50/50",
    warning: "border-amber-200 bg-amber-50/50",
    success: "border-emerald-200 bg-emerald-50/50",
    info: "border-blue-200 bg-blue-50/50",
  };

  const iconVariants = {
    default: "text-muted-foreground",
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    info: "text-blue-500",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border p-5 transition-all",
        variants[variant],
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-semibold text-foreground mt-1 tracking-tight">{value}</p>
        </div>
        {Icon && <Icon className={cn("h-5 w-5 mt-1", iconVariants[variant])} />}
      </div>
    </div>
  );
}