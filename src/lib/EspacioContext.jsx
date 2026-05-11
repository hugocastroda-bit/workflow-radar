import { createContext, useContext, useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

// El rol 'admin' en Base44 = 'Administrador Global' en Radar C&T
export const isAdminGlobal = (user) => user?.role === "admin";

const EspacioContext = createContext(null);

export function useEspacio() {
  return useContext(EspacioContext);
}

// Roles with elevated permissions (owner + admin of space)
export function isEspacioAdmin(membresia) {
  return membresia?.rolEnEspacio === "Owner Espacio" || membresia?.rolEnEspacio === "Admin Espacio";
}

export function isEspacioReadOnly(membresia) {
  return membresia?.rolEnEspacio === "Solo lectura";
}

export default function EspacioProvider() {
  const [espacioActivo, setEspacioActivo] = useState(null);
  const [membresiaActiva, setMembresiaActiva] = useState(null);
  const [loadingEspacio, setLoadingEspacio] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    const restoreAndValidate = async () => {
      try {
        const stored = localStorage.getItem("radarct_espacio");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.espacio?.id && parsed?.membresia) {
            // Validate the space is still active
            const espacios = await base44.entities.EspacioEquipo.filter({ estado: "Activo" });
            const stillActive = espacios.find(e => e.id === parsed.espacio.id);
            if (stillActive) {
              // Also verify membership is still active
              try {
                const membs = await base44.entities.MembresiaEspacio.filter({ espacioId: parsed.espacio.id });
                const emailStored = (parsed.membresia.correoUsuario || "").toLowerCase().trim();
                const activeMem = membs.find(m =>
                  (m.correoUsuario || "").toLowerCase().trim() === emailStored &&
                  m.estado === "Activo"
                );
                if (activeMem) {
                  setEspacioActivo(stillActive);
                  setMembresiaActiva(activeMem);
                } else {
                  localStorage.removeItem("radarct_espacio");
                }
              } catch {
                // If membership check fails, still restore (safe fallback)
                setEspacioActivo(stillActive);
                setMembresiaActiva(parsed.membresia);
              }
            } else {
              // Space was deactivated or deleted — clear stored session
              localStorage.removeItem("radarct_espacio");
            }
          }
        }
      } catch {
        // If validation fails, clear to force re-selection
        localStorage.removeItem("radarct_espacio");
      }
      setLoadingEspacio(false);
    };
    restoreAndValidate();
  }, []);

  useEffect(() => {
    // Wait for localStorage check AND auth to finish loading
    if (loadingEspacio || isLoadingAuth) return;
    if (espacioActivo) return;
    // Admin can access gestion-espacios without an active space
    const bypassPaths = ["/espacios", "/gestion-espacios"];
    if (bypassPaths.includes(location.pathname)) return;
    navigate("/espacios", { replace: true });
  }, [loadingEspacio, isLoadingAuth, espacioActivo, location.pathname]);

  const entrarEspacio = (espacio, membresia) => {
    setEspacioActivo(espacio);
    setMembresiaActiva(membresia);
    localStorage.setItem("radarct_espacio", JSON.stringify({ espacio, membresia }));
    navigate("/", { replace: true });
  };

  const salirDeEspacio = () => {
    setEspacioActivo(null);
    setMembresiaActiva(null);
    localStorage.removeItem("radarct_espacio");
    navigate("/espacios", { replace: true });
  };

  return (
    <EspacioContext.Provider value={{ espacioActivo, membresiaActiva, entrarEspacio, salirDeEspacio, loadingEspacio }}>
      <Outlet />
    </EspacioContext.Provider>
  );
}