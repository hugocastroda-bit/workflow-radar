import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import WhatsAppFloating from "@/components/WhatsAppFloating";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import LandingHero from "@/components/landing/LandingHero";
import LandingComparison from "@/components/landing/LandingComparison";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingProcesses from "@/components/landing/LandingProcesses";
import LandingPlans from "@/components/landing/LandingPlans";
import LandingDemo from "@/components/landing/LandingDemo";
import ScrollAnimations from "@/components/landing/ScrollAnimations";

export default function Landing() {
  const [form, setForm] = useState({
    nombre: "", empresa: "", cargo: "", email: "", telefono: "",
    usuarios: "", mensaje: "", plan: "",
  });
  const [formSent, setFormSent] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      toast.info("Tu sesión expiró. Inicia sesión nuevamente para continuar.", { duration: 6000, position: "top-center" });
      window.history.replaceState(null, "", "/");
    } else if (params.get("auth") === "true") {
      toast.info("Para acceder a Workflow Radar, inicia sesión.", { duration: 5000, position: "top-center" });
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const handleFormChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const selectPlan = (planName) => {
    setForm((prev) => ({ ...prev, plan: planName }));
    scrollTo("demo");
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.nombre.trim() || !form.email.trim()) {
      setFormError("Nombre y correo son obligatorios.");
      return;
    }
    setFormLoading(true);
    try {
      await base44.entities.DemoRequest.create({
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim(),
        cargo: form.cargo.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        usuarios: form.usuarios.trim(),
        mensaje: form.mensaje.trim(),
        plan: form.plan,
      });
      setFormSent(true);
    } catch (err) {
      setFormError(err.message || "Error al enviar. Intenta de nuevo.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg text-foreground">
      <ScrollAnimations />

      {/* ── HEADER ── */}
      <header className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "glass-premium border-border shadow-sm"
          : "bg-transparent border-transparent"
      )}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          <span className="text-sm font-semibold tracking-tight text-foreground">Workflow Radar</span>
          <nav className="hidden md:flex items-center gap-7">
            <button onClick={() => scrollTo("caracteristicas")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Características</button>
            <button onClick={() => scrollTo("planes")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Planes</button>
            <button onClick={() => scrollTo("demo")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Demo</button>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/seleccionar-empresa">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:scale-[1.02] transition-transform">Elegir empresa</Button>
              </Link>
            ) : (
              <Link to="/acceso">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:scale-[1.02] transition-transform">Iniciar sesión</Button>
              </Link>
            )}
            <Button size="sm" className="h-8 text-xs rounded-[12px] hover:scale-[1.02] transition-transform" onClick={() => scrollTo("demo")}>
              Solicitar demo
            </Button>
          </div>
        </div>
      </header>

      {/* ── SECTIONS ── */}
      <LandingHero onScrollTo={scrollTo} />
      <LandingComparison />
      <LandingFeatures />
      <LandingProcesses />
      <LandingPlans onSelectPlan={selectPlan} />
      <LandingDemo
        form={form}
        formSent={formSent}
        formLoading={formLoading}
        formError={formError}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
      />

      <WhatsAppFloating />

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-4 md:px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Workflow Radar</p>
            <p className="text-[10px] text-muted-foreground">by Design Lab</p>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => scrollTo("planes")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Planes</button>
            <button onClick={() => scrollTo("demo")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Demo</button>
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Acerca de</Link>
            <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contacto</Link>
          </div>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Workflow Radar</p>
        </div>
      </footer>
    </div>
  );
}