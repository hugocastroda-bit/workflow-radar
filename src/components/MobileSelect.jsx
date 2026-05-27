import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * MobileSelect — Bottom sheet selector con diseño nativo iOS/Android.
 *
 * Props:
 *  - label:       string (opcional)
 *  - required:    boolean
 *  - value:       string (valor seleccionado actual)
 *  - onChange:    (value: string) => void
 *  - placeholder: string
 *  - options:     string[] | { value: string, label: string, sublabel?: string }[]
 *  - disabled:    boolean
 */
export default function MobileSelect({
  label,
  required,
  value,
  onChange,
  placeholder = "Seleccionar",
  options = [],
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  // Normalizar opciones a formato estándar
  const normalized = options.map(o =>
    typeof o === "string" ? { value: o, label: o, sublabel: null } : o
  );

  const selected = normalized.find(o => o.value === value) || null;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  // Bloquear scroll del body cuando el sheet está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="fixed bottom-0 inset-x-0 z-[201] bg-card rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                {label || placeholder}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto max-h-[55dvh]">
              {/* Opción vacía / limpiar */}
              {!required && (
                <button
                  onClick={() => handleSelect("")}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border/50",
                    !value ? "bg-accent/40" : "hover:bg-secondary"
                  )}
                >
                  <span className="text-sm text-muted-foreground italic">{placeholder}</span>
                  {!value && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              )}

              {normalized.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-secondary active:bg-secondary/80"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className={cn(
                        "text-sm leading-tight",
                        isSelected ? "font-semibold text-primary" : "text-foreground"
                      )}>
                        {opt.label}
                      </p>
                      {opt.sublabel && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{opt.sublabel}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer cancelar */}
            <div className="px-4 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div>
      {label && (
        <Label className="text-xs font-medium text-muted-foreground">
          {label}{required && " *"}
        </Label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "mt-1 w-full min-h-[44px] flex items-center justify-between gap-2",
          "px-3 py-2.5 rounded-xl border border-border bg-background",
          "text-left text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "hover:bg-secondary active:bg-secondary/80",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <span className={cn("flex-1 truncate", !selected ? "text-muted-foreground" : "text-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Render sheet via portal para evitar problemas de z-index en dialogs */}
      {typeof document !== "undefined" && createPortal(sheet, document.body)}
    </div>
  );
}