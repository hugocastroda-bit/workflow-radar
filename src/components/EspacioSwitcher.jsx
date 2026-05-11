import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, LayoutGrid } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio } from "@/lib/EspacioContext";

export default function EspacioSwitcher() {
  const { user } = useAuth();
  const { espacioActivo, entrarEspacio } = useEspacio();
  const [open, setOpen] = useState(false);
  const [espacios, setEspacios] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!user?.email) return;
    const emailNormalized = user.email.toLowerCase().trim();
    Promise.all([
      base44.entities.MembresiaEspacio.filter({ correoUsuario: emailNormalized, estado: "Activo" }),
      base44.entities.EspacioEquipo.list()
    ]).then(([membs, esps]) => {
      const items = membs
        .map(m => ({ membresia: m, espacio: esps.find(e => e.id === m.espacioId) }))
        .filter(i => i.espacio && i.espacio.estado === "Activo");
      setEspacios(items);
    }).catch(() => {});
  }, [user?.email]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (espacios.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1 mt-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded px-1.5 py-1 transition-colors"
      >
        <span className="flex items-center gap-1 truncate">
          <LayoutGrid className="h-3 w-3 shrink-0" />
          <span className="truncate">{espacioActivo?.nombreEspacio || "Cambiar espacio"}</span>
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Mis espacios</p>
          {espacios.map(({ espacio, membresia }) => (
            <button
              key={espacio.id}
              onClick={() => { entrarEspacio(espacio, membresia); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <Check className={`h-3.5 w-3.5 shrink-0 ${espacioActivo?.id === espacio.id ? "text-slate-800" : "text-transparent"}`} />
              <div className="truncate">
                <p className="font-medium truncate">{espacio.nombreEspacio}</p>
                <p className="text-xs text-slate-400">{membresia.rolEnEspacio}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}