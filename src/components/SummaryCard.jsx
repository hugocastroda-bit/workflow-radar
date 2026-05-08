import { cn } from "@/lib/utils";

const variantStyles = {
  default: { card: "", value: "text-foreground" },
  danger: { card: "border-red-200", value: "text-red-600" },
  warning: { card: "border-amber-200", value: "text-amber-600" },
  success: { card: "border-emerald-200", value: "text-emerald-700" },
  info: { card: "", value: "text-foreground" },
};

export default function SummaryCard({ title, value, variant = "default", onClick }) {
  const v = variantStyles[variant] || variantStyles.default;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border px-5 py-4",
        v.card,
        onClick && "cursor-pointer hover:shadow-sm transition-shadow"
      )}
    >
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
      <p className={cn("text-3xl font-semibold mt-1.5 tracking-tight", v.value)}>{value}</p>
    </div>
  );
}