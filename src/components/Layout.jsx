import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Inbox, Columns3, BarChart3, Settings, Plus, LogOut, Upload, Archive, Bug } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ThemeToggle from "@/components/ThemeToggle";
import PageTransition from "@/components/PageTransition";
import Bandeja from "@/pages/Bandeja";
import Kanban from "@/pages/Kanban";
import Dashboard from "@/pages/Dashboard";

const PAGE_TITLES = {
  "/":             "Bandeja",
  "/bandeja":      "Bandeja",
  "/kanban":       "Kanban",
  "/dashboard":    "Dashboard",
  "/configuracion":"Configuración",
  "/carga-masiva": "Carga masiva",
  "/archivados":   "Archivados",
  "/diagnostico":  "Diagnóstico",
};


const NAV_ITEMS = [
  { path: "/",              label: "Bandeja",       icon: Inbox },
  { path: "/kanban",        label: "Kanban",         icon: Columns3 },
  { path: "/dashboard",     label: "Dashboard",      icon: BarChart3 },
  { path: "/carga-masiva",  label: "Carga masiva",   icon: Upload },
  { path: "/configuracion", label: "Configuración",  icon: Settings, adminOnly: true },
  { path: "/archivados",    label: "Archivados",     icon: Archive,  adminOnly: true },
  { path: "/diagnostico",   label: "Diagnóstico",    icon: Bug,      adminOnly: true },
];

const BOTTOM_NAV = [
  { path: "/",          label: "Bandeja",   icon: Inbox },
  { path: "/kanban",    label: "Kanban",    icon: Columns3 },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";
  const visible  = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const isActive = (path) =>
    location.pathname === path || (path === "/" && location.pathname === "/bandeja");

  const currentPageTitle = PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/pedido/") ? "Detalle de pedido" : "Workflow Radar");

  const go = (path) => {
    if (isActive(path)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(path, { replace: true });
    }
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-background flex">

      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside className="hidden md:flex w-52 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30 no-select">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">WORKFLOW</p>
          <h1 className="text-sm font-semibold text-foreground">RADAR</h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visible.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Link
            to="/?crear=true"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo pedido
          </Link>
          <div className="flex items-center justify-between">
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ─────────────────────────── */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-30 bg-card border-b border-border no-select"
        style={{
          paddingTop:   "max(12px, env(safe-area-inset-top))",
          paddingLeft:  "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="flex items-center justify-between px-4 pb-2">
          <div>
            <p className="text-xs text-muted-foreground leading-none">Workflow Radar</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{currentPageTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/?crear=true"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="h-3 w-3" /> Nuevo
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <main
        className="flex-1 md:ml-52 overflow-y-auto overflow-x-hidden ios-scroll"
        style={{
          marginTop:     "calc(56px + max(12px, env(safe-area-inset-top)))",
          paddingBottom: "calc(64px + max(12px, env(safe-area-inset-bottom)))",
        }}
      >
        {(() => {
          const isMainPage = ["/", "/bandeja", "/kanban", "/dashboard"].includes(location.pathname);
          if (isMainPage) {
            return (
              <>
                <div style={{ display: (isActive("/") || isActive("/bandeja")) ? 'block' : 'none' }}>
                  <Bandeja />
                </div>
                <div style={{ display: isActive("/kanban") ? 'block' : 'none' }}>
                  <Kanban />
                </div>
                <div style={{ display: isActive("/dashboard") ? 'block' : 'none' }}>
                  <Dashboard />
                </div>
              </>
            );
          }
          return (
            <PageTransition>
              <Outlet />
            </PageTransition>
          );
        })()}
      </main>

      {/* ── Mobile Bottom Navigation Bar ──────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border flex no-select"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft:   "env(safe-area-inset-left)",
          paddingRight:  "env(safe-area-inset-right)",
        }}
      >
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors active:scale-95 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}