import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Inbox, Columns3, BarChart3, Settings, Plus, LogOut, Upload, Archive, Bug, Building2, ChevronDown } from "lucide-react";
import WhatsAppFloating from "@/components/WhatsAppFloating";
import { base44 } from "@/api/base44Client";
import ThemeToggle from "@/components/ThemeToggle";
import PageTransition from "@/components/PageTransition";
import Bandeja from "@/pages/Bandeja";
import Kanban from "@/pages/Kanban";
import Dashboard from "@/pages/Dashboard";

const PAGE_TITLES = {
  "/bandeja":      "Bandeja",
  "/kanban":       "Kanban",
  "/dashboard":    "Dashboard",
  "/configuracion":"Configuración",
  "/empresas":     "Empresas",
  "/carga-masiva": "Carga masiva",
  "/archivados":   "Archivados",
  "/diagnostico":  "Diagnóstico",
};


const NAV_ITEMS = [
  { path: "/bandeja",      label: "Bandeja",       icon: Inbox },
  { path: "/kanban",        label: "Kanban",         icon: Columns3 },
  { path: "/dashboard",     label: "Dashboard",      icon: BarChart3 },
  { path: "/carga-masiva",  label: "Carga masiva",   icon: Upload },
  { path: "/empresas",      label: "Empresas",       icon: Building2, platformAdminOnly: true },
  { path: "/configuracion", label: "Configuración",  icon: Settings, adminOnly: true },
  { path: "/archivados",    label: "Archivados",     icon: Archive,  adminOnly: true },
  { path: "/diagnostico",   label: "Diagnóstico",    icon: Bug,      adminOnly: true },
];

const BOTTOM_NAV = [
  { path: "/bandeja",   label: "Bandeja",   icon: Inbox },
  { path: "/kanban",    label: "Kanban",    icon: Columns3 },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, empresaActiva } = useAuth();
  const isAdmin  = ["Owner", "Admin"].includes(empresaActiva?.rol);
  const isPlatformAdmin = user?.role === "admin";
  const visible  = NAV_ITEMS.filter((item) =>
    (!item.adminOnly || isAdmin) && (!item.platformAdminOnly || isPlatformAdmin)
  );

  const isActive = (path) => location.pathname === path;

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
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex">

      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside className="hidden md:flex w-52 flex-col border-r border-border bg-white fixed inset-y-0 left-0 z-30 no-select">
        <div className="px-5 py-4 border-b border-border space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">WORKFLOW</p>
            <h1 className="text-sm font-bold text-foreground tracking-tight">RADAR</h1>
          </div>
          {empresaActiva && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{empresaActiva.nombre}</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visible.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white font-medium shadow-sm shadow-[#4F46E5]/25"
                  : "text-muted-foreground hover:bg-[#F1F5F9] hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Link
            to="/bandeja?crear=true"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white shadow-sm shadow-[#4F46E5]/20 hover:shadow-md hover:shadow-[#4F46E5]/30 transition-all w-full"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo pedido
          </Link>
          <div className="space-y-1.5">
            <button
              onClick={() => base44.auth.logout(window.location.origin + "/")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-[#F1F5F9] transition-colors w-full"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
            <div className="flex items-center justify-between px-3 py-1.5">
              <Link to="/seleccionar-empresa" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[100px]">{empresaActiva?.nombre || "Empresa"}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </Link>
              <ThemeToggle />
            </div>
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
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground leading-none">Workflow Radar</p>
              {empresaActiva && (
                <span className="text-[10px] text-primary/70 leading-none truncate">· {empresaActiva.nombre}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-tight truncate">{currentPageTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/bandeja?crear=true"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="h-3 w-3" /> Nuevo
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <main
        className="min-w-0 flex-1 md:ml-52 overflow-y-auto overflow-x-hidden ios-scroll"
        style={{
          marginTop:     "calc(56px + max(12px, env(safe-area-inset-top)))",
          paddingBottom: "calc(64px + max(12px, env(safe-area-inset-bottom)))",
        }}
      >
        {(() => {
          const isMainPage = ["/bandeja", "/kanban", "/dashboard"].includes(location.pathname);
          if (isMainPage) {
            return (
              <>
                <div style={{ display: isActive("/bandeja") ? 'block' : 'none' }}>
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

      <WhatsAppFloating />

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
