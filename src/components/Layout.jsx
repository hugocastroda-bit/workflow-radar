import { Outlet, Link, useLocation } from "react-router-dom";
import EspacioSwitcher from "./EspacioSwitcher";
import { useAuth } from "@/lib/AuthContext";
import { useEspacio } from "@/lib/EspacioContext";
import { Inbox, Columns3, BarChart3, Settings, Plus, LogOut, Upload, Archive, LayoutGrid, Bug } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Bandeja", icon: Inbox },
  { path: "/kanban", label: "Kanban", icon: Columns3 },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/carga-masiva", label: "Carga masiva", icon: Upload, adminOnly: true },
  { path: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
  { path: "/archivados", label: "Archivados", icon: Archive, adminOnly: true }
];

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const { espacioActivo } = useEspacio();
  const isAdmin = user?.role === "admin";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-52 flex-col border-r border-slate-200 bg-white fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400">RADAR CT</p>
          <h1 className="text-sm font-semibold text-slate-800 truncate mt-2" title={espacioActivo?.nombreEspacio}>
            {espacioActivo?.nombreEspacio || "Sin espacio"}
          </h1>
          <EspacioSwitcher />
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-slate-900 text-white font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link
            to="/?crear=true"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo pedido
          </Link>
          {isAdmin && (
            <Link
              to="/gestion-espacios"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors w-full"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Espacios
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/diagnostico"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors w-full"
            >
              <Bug className="h-3.5 w-3.5" /> Diagnostico
            </Link>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-12">
          <div>
            <p className="text-xs text-slate-400">Radar</p>
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
              {espacioActivo?.nombreEspacio || ""}
            </p>
          </div>
          <Link
            to="/?crear=true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 text-white"
          >
            <Plus className="h-3 w-3" /> Nuevo
          </Link>
        </div>
        <nav className="flex px-3 pb-2 gap-1 overflow-x-auto">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 md:ml-52 mt-24 md:mt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}