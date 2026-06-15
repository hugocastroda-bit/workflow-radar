const CONFIG = {
  Bajo:  { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
  Medio: { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-300" },
  Alto:  { dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-950/30",       text: "text-red-700 dark:text-red-300" },
};

export default function RiesgoBadge({ riesgo, size = "sm" }) {
  if (!riesgo || !CONFIG[riesgo]) return null;
  const c = CONFIG[riesgo];
  const isXs = size === "xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-border/50 ${c.bg} ${isXs ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-xs"} font-medium ${c.text}`}>
      <span className={`rounded-full ${isXs ? "h-1.5 w-1.5" : "h-2 w-2"} ${c.dot}`} />
      {riesgo}
    </span>
  );
}