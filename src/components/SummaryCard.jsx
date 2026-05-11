import { cn } from "@/lib/utils";

const variantStyles = {
  default: { card: "border-border", value: "text-foreground" },
  danger: { card: "border-alert/30", value: "text-alert" },
  warning: { card: "border-warning/30", value: "text-warning" },
  success: { card: "border-success/30", value: "text-success" },
  info: { card: "border-border", value: "text-foreground" },
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