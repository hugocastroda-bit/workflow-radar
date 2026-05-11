import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Inbox, Columns3, BarChart3, Settings, Plus, LogOut, Upload, Archive, LayoutGrid, Bug } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Bandeja", icon: Inbox },
  { path: "/kanban", label: "Kanban", icon: Columns3 },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/carga-masiva", label: "Carga masiva", icon: Upload, adminOnly: true },
  { path: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
  { path: "/archivados", label: "Archivados", icon: Archive, adminOnly: true },
  { path: "/diagnostico", label: "Diagnóstico", icon: Bug, adminOnly: true }
];

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-52 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">RADAR CT</p>
          <h1 className="text-sm font-semibold text-foreground">Gestión Humana</h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/?crear=true"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo pedido
          </Link>

          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div>
            <p className="text-xs text-muted-foreground">Radar</p>
            <p className="text-sm font-semibold text-foreground">Gestión</p>
          </div>
          <Link
            to="/?crear=true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
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
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
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