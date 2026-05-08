import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Columns3, BarChart3, Plus, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Inicio", icon: LayoutDashboard },
  { path: "/bandeja", label: "Bandeja", icon: Inbox },
  { path: "/kanban", label: "Kanban", icon: Columns3 },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-52 flex-col border-r border-border bg-white fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground tracking-tight">{"Radar C&T"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cultura y Talento</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 pt-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/bandeja?crear=true"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors w-full justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo pedido
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <p className="text-sm font-semibold text-foreground">{"Radar C&T"}</p>
          <Link to="/bandeja?crear=true" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary text-white">
            <Plus className="h-3.5 w-3.5" /> Nuevo
          </Link>
        </div>
        <nav className="flex px-2 pb-2 gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 md:ml-52 mt-[96px] md:mt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}