import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, ChevronUp } from "lucide-react";

export default function SearchableSelect({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const display = value || "";

  return (
    <div ref={ref} className="relative">
      {label && (
        <Label className="text-xs font-medium text-muted-foreground">
          {label}{required && " *"}
        </Label>
      )}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={display ? "text-foreground" : "text-muted-foreground"}>
          {display || placeholder}
        </span>
        {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md">
          <div className="flex items-center border-b px-2 py-1.5 gap-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {!required && value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-left rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              >
                — Sin asignar
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
            )}
            {filtered.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${value === o ? "bg-accent font-medium" : ""}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}