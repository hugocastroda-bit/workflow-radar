import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Inbox, Columns3, BarChart3, Settings, Plus, LogOut, Upload, Archive, Bug } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";

const navItems = [
  { path: "/",           label: "Bandeja",       icon: Inbox },
  { path: "/kanban",     label: "Kanban",         icon: Columns3 },
  { path: "/dashboard",  label: "Dashboard",      icon: BarChart3 },
  { path: "/carga-masiva",   label: "Carga masiva",  icon: Upload,   adminOnly: true },
  { path: "/configuracion",  label: "Configuración", icon: Settings, adminOnly: true },
  { path: "/archivados",     label: "Archivados",    icon: Archive,  adminOnly: true },
  { path: "/diagnostico",    label: "Diagnóstico",   icon: Bug,      adminOnly: true },
];

// Only these three appear in the mobile bottom bar
const bottomNavPaths = ["/", "/kanban", "/dashboard"];

const pageVariants = {
  initial: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit:    (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};
const pageTransition = { type: "tween", duration: 0.22 };

// Ordered path list to determine slide direction
const orderedPaths = ["/", "/bandeja", "/kanban", "/dashboard",
  "/carga-masiva", "/archivados", "/configuracion", "/diagnostico"];

function getPathIndex(pathname) {
  const idx = orderedPaths.indexOf(pathname);
  return idx === -1 ? 0 : idx;
}

export default function Layout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const visibleNavItems  = navItems.filter((item) => !item.adminOnly || isAdmin);
  const bottomNavItems   = navItems.filter((item) => bottomNavPaths.includes(item.path));

  const prevIndexRef = useRef(getPathIndex(location.pathname));
  const curIndex     = getPathIndex(location.pathname);
  const direction    = curIndex - prevIndexRef.current;
  prevIndexRef.current = curIndex;

  const isActive = (path) =>
    location.pathname === path || (path === "/" && location.pathname === "/bandeja");

  const handleNavClick = (path) => {
    if (isActive(path)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Desktop Sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex w-52 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30 select-none">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">RADAR CT</p>
          <h1 className="text-sm font-semibold text-foreground">Gestión Humana</h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
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
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/?crear=true"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo pedido
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ─────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-30 bg-card border-b border-border select-none"
        style={{
          paddingTop:   "max(0px, env(safe-area-inset-top))",
          paddingLeft:  "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-12">
          <div>
            <p className="text-xs text-muted-foreground">Radar</p>
            <p className="text-sm font-semibold text-foreground">Gestión Humana</p>
          </div>
          <Link
            to="/?crear=true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-3 w-3" /> Nuevo
          </Link>
        </div>
      </div>

      {/* ── Main Content with Page Transitions ────────────────── */}
      <main
        className="flex-1 md:ml-52 md:mt-0 min-h-screen overflow-x-hidden"
        style={{
          marginTop:     "calc(48px + max(0px, env(safe-area-inset-top)))",
          paddingBottom: "calc(64px + max(0px, env(safe-area-inset-bottom)))",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Navigation Bar ──────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border flex select-none"
        style={{
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          paddingLeft:   "env(safe-area-inset-left)",
          paddingRight:  "env(safe-area-inset-right)",
        }}
      >
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 transition-colors active:scale-95 ${
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