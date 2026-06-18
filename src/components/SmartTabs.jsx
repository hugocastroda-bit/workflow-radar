const TABS = [
  { key: "todos",           label: "Todos" },
  { key: "mis",             label: "Mis Pedidos" },
  { key: "asignar",         label: "Por Asignar" },
  { key: "vencidos",        label: "Vencidos" },
  { key: "bloqueados",      label: "Bloqueados" },
];

export default function SmartTabs({ activeTab, onTabChange, counts }) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        const count = counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`
              relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md
              transition-all duration-200 select-none
              ${isActive
                ? "text-foreground bg-accent dark:bg-[#002244] dark:text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:text-[#7E84A3]"
              }
            `}
          >
            {label}
            <span className={`
              inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold tabular-nums
              transition-all duration-200
              ${isActive
                ? "bg-primary/20 text-primary dark:bg-[#00A3FF]/20 dark:text-[#00A3FF]"
                : "bg-muted text-muted-foreground"
              }
            `}>
              {count}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary dark:bg-[#00A3FF]" />
            )}
          </button>
        );
      })}
    </div>
  );
}