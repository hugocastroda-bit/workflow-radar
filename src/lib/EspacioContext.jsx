import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

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
  const { user } = useAuth();
  const isAdminGeneral = user?.role === "admin";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("radarct_espacio");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.espacio && parsed?.membresia) {
          setEspacioActivo(parsed.espacio);
          setMembresiaActiva(parsed.membresia);
        }
      }
    } catch {}
    setLoadingEspacio(false);
  }, []);

  useEffect(() => {
    // Wait for both localStorage check and user to load
    if (loadingEspacio || user === undefined) return;
    if (espacioActivo) return;
    const bypassPaths = ["/espacios", "/gestion-espacios"];
    if (bypassPaths.includes(location.pathname)) return;
    // Admin generals can navigate to /gestion-espacios without a space
    // Everyone else goes to /espacios to select or see the blocked message
    navigate("/espacios", { replace: true });
  }, [loadingEspacio, espacioActivo, location.pathname, user]);

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