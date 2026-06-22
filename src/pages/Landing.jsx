import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import WhatsAppFloating from "@/components/WhatsAppFloating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Inbox,
  Columns3,
  BarChart3,
  Clock,
  Shield,
  Users,
  Filter,
  FileSpreadsheet,
  Settings,
  Search,
  Eye,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

const PLANS = [
  {
    name: "Essential",
    usuarios: "Hasta 5 usuarios",
    precio: "S/ 39",
    precioPeriodo: "al mes",
    porUsuario: "S/ 7.80 por usuario/mes",
    implementacion: "S/ 150",
    creditos: "5 créditos de cambios mensuales",
    cta: "Solicitar demo",
    incluye: [
      "Bandeja de pedidos",
      "Kanban",
      "Dashboard básico",
      "Configuración de catálogos",
      "Archivados",
      "5 créditos de cambios mensuales",
    ],
    destacado: false,
    color: "border-border",
  },
  {
    name: "Team",
    usuarios: "Hasta 10 usuarios",
    precio: "S/ 74",
    precioPeriodo: "al mes",
    porUsuario: "S/ 7.40 por usuario/mes",
    implementacion: "S/ 250",
    creditos: "10 créditos de cambios mensuales",
    cta: "Solicitar demo",
    incluye: [
      "Todo Essential",
      "Time Box en minutos",
      "Riesgos y SLA",
      "Exportación Excel",
      "Carga masiva",
      "10 créditos de cambios mensuales",
    ],
    destacado: false,
    color: "border-border",
  },
  {
    name: "Pro",
    usuarios: "Hasta 20 usuarios",
    precio: "S/ 124",
    precioPeriodo: "al mes",
    porUsuario: "S/ 6.20 por usuario/mes",
    implementacion: "S/ 450",
    creditos: "20 créditos de cambios mensuales",
    cta: "Solicitar demo",
    etiqueta: "Más popular",
    incluye: [
      "Todo Team",
      "Dashboard ejecutivo",
      "Medición de carga por responsable",
      "Reportes ejecutivos",
      "Soporte prioritario",
      "20 créditos de cambios mensuales",
    ],
    destacado: true,
    color: "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/30",
  },
  {
    name: "Business",
    usuarios: "Más de 20 usuarios",
    precio: "S/ 199",
    precioPeriodo: "al mes",
    porUsuario: "Precio según cantidad de usuarios",
    implementacion: "Desde S/ 700",
    creditos: "40 créditos de cambios mensuales",
    cta: "Contactar ventas",
    incluye: [
      "Todo Pro",
      "Branding de empresa",
      "Configuración avanzada",
      "Reportes personalizados",
      "Acompañamiento mensual",
      "40 créditos de cambios mensuales",
    ],
    destacado: false,
    color: "border-border",
  },
];

const CREDIT_TABLE = [
  { creditos: "1 crédito", descripcion: "Ajuste menor de texto, etiqueta, color o copy." },
  { creditos: "2 créditos", descripcion: "Ajuste de filtro, columna o visualización simple." },
  { creditos: "3 créditos", descripcion: "Cambio en formulario, tabla o regla menor." },
  { creditos: "4 créditos", descripcion: "Nueva métrica simple o ajuste de dashboard." },
  { creditos: "5 créditos o más", descripcion: "Mejora funcional más compleja, previa evaluación." },
];

const FAQ_ITEMS = [
  {
    q: "¿Qué tipo de equipos usan Workflow Radar?",
    a: "Equipos de operaciones, recursos humanos, TI y áreas de servicio interno que necesitan ordenar pedidos, asignar responsables y medir carga de trabajo con trazabilidad.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Es una aplicación web. Solo necesitas un navegador y conexión a internet.",
  },
  {
    q: "¿Puedo empezar con pocos usuarios?",
    a: "Sí. El plan Basic permite iniciar hasta con 5 usuarios.",
  },
  {
    q: "¿Se puede personalizar?",
    a: "Sí. Cada plan incluye créditos mensuales para ajustes menores según las necesidades de tu equipo.",
  },
  {
    q: "¿Puedo pedir más cambios?",
    a: "Sí. Los cambios adicionales se cotizan según el alcance del requerimiento.",
  },
  {
    q: "¿La implementación tiene costo único?",
    a: "Sí. Cada plan incluye una implementación inicial para configurar usuarios, catálogos y procesos.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden max-w-3xl mx-auto">
      {/* Fake browser bar */}
      <div className="bg-secondary/60 px-4 py-3 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/60" />
          <div className="w-3 h-3 rounded-full bg-amber-400/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center truncate">
            app.radardesignlab.com/bandeja
          </div>
        </div>
        <div className="w-12" />
      </div>
      {/* Sidebar + content layout */}
      <div className="flex h-80">
        {/* Fake sidebar */}
        <div className="w-36 bg-secondary/30 border-r border-border p-3 space-y-1.5 shrink-0">
          <div className="text-[10px] font-semibold text-muted-foreground mb-2">WORKFLOW</div>
          <div className="h-5 bg-primary/20 rounded w-full" />
          <div className="h-5 bg-secondary rounded w-3/4" />
          <div className="h-5 bg-secondary rounded w-3/4" />
          <div className="h-5 bg-secondary rounded w-4/5 mt-2" />
        </div>
        {/* Fake content */}
        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-secondary rounded" />
            <div className="h-5 w-32 bg-secondary rounded" />
          </div>
          {/* Fake table rows */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${i === 2 ? "bg-red-400" : i === 4 ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="h-4 bg-secondary rounded flex-1" />
              <div className={`h-4 w-14 rounded-full px-2 text-[9px] flex items-center justify-center ${
                i === 1 ? "bg-blue-100 text-blue-700" : i === 2 ? "bg-red-100 text-red-700" : i === 3 ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
              }`}>
                {i === 1 ? "Asignado" : i === 2 ? "Vencido" : i === 3 ? "En curso" : "Nuevo"}
              </div>
              <div className="h-4 w-16 bg-secondary rounded" />
            </div>
          ))}
          {/* Kanban mini */}
          <div className="flex gap-2 mt-2">
            {["Nuevo", "Asignado", "En curso"].map((col) => (
              <div key={col} className="flex-1 bg-secondary/40 rounded-lg p-2">
                <div className="text-[9px] font-semibold text-muted-foreground mb-1">{col}</div>
                <div className="h-8 bg-card rounded border border-border mb-1" />
                <div className="h-8 bg-card rounded border border-border" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({
    nombre: "", empresa: "", cargo: "", email: "", telefono: "",
    usuarios: "", mensaje: "", plan: "",
  });
  const [formSent, setFormSent] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { isAuthenticated } = useAuth();

  // ── Redirect messages: show when bounced from ProtectedRoute ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      toast.info("Tu sesión expiró. Inicia sesión nuevamente para continuar.", {
        duration: 6000,
        position: "top-center",
      });
      window.history.replaceState(null, "", "/");
    } else if (params.get("auth") === "true") {
      toast.info("Para acceder a Workflow Radar, inicia sesión.", {
        duration: 5000,
        position: "top-center",
      });
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectPlan = (planName) => {
    setForm((prev) => ({ ...prev, plan: planName }));
    scrollTo("demo");
  };

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
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ──────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#F5F7FB]/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">Workflow Radar</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">by Design Lab</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo("planes")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver planes
            </button>
            <button onClick={() => scrollTo("demo")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Contactar demo
            </button>
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Acerca de
            </Link>
            <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </Link>
            {isAuthenticated ? (
              <Link to="/bandeja" className="text-xs text-primary hover:underline font-medium transition-colors">
                Ir a mi bandeja
              </Link>
            ) : (
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Iniciar sesión
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 text-xs rounded-[12px]" onClick={() => scrollTo("demo")}>
            Solicitar demo
            </Button>
            {isAuthenticated ? (
              <Link to="/bandeja">
                <Button variant="default" size="sm" className="h-8 text-xs rounded-[12px]">
                  Ir a mi bandeja
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Iniciar sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────── */}
      <section className="px-4 md:px-6 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
              Gestiona pedidos, responsables y carga de trabajo sin perder el control.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Workflow Radar centraliza solicitudes internas, organiza responsables, mide capacidad y da trazabilidad a los procesos de tu equipo.
            </p>
            <ul className="space-y-2.5">
              {[
                "Centraliza pedidos en una sola bandeja.",
                "Visualiza avances con Kanban.",
                "Mide carga de trabajo con Time Box en minutos.",
                "Controla vencimientos, riesgos y responsables.",
                "Da trazabilidad a cada solicitud.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => scrollTo("demo")} className="rounded-[14px]">
                Solicitar demo <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
              <Button variant="outline" onClick={() => scrollTo("planes")} className="rounded-[14px]">
                Ver planes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Prueba guiada disponible para equipos pequeños y medianos.</p>
          </div>
          <div className="hidden md:block">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW (Mobile) ────────── */}
      <section className="md:hidden px-4 pb-12 max-w-6xl mx-auto">
        <ProductPreview />
      </section>

      {/* ── PROBLEM / VALUE ─────────────────── */}
      <section className="bg-secondary/30 px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-10">
            El trabajo se pierde cuando no hay trazabilidad.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Pedidos dispersos", desc: "Solicitudes por correo, WhatsApp o conversaciones se pierden fácilmente.", icon: MessageSquare },
              { title: "Sobrecarga invisible", desc: "No siempre es claro quién tiene más carga ni qué pedidos están vencidos.", icon: AlertTriangle },
              { title: "Seguimiento manual", desc: "Sin una vista central, los responsables actualizan tarde o no actualizan.", icon: Search },
              { title: "Poca visibilidad ejecutiva", desc: "Los líderes necesitan ver estado, prioridad, riesgo y capacidad en minutos.", icon: Eye },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5]/10 to-[#8B5CF6]/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ──────────────────────── */}
      <section className="px-4 md:px-6 py-16 md:py-20 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-10">
          Lo que resuelve Workflow Radar
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Bandeja centralizada", desc: "Recibe, ordena y filtra todos los pedidos internos.", icon: Inbox },
            { title: "Kanban operativo", desc: "Visualiza el avance por estado y responsable.", icon: Columns3 },
            { title: "Time Box en minutos", desc: "Estima esfuerzo, mide desviación y detecta sobrecarga.", icon: Clock },
            { title: "Dashboard ejecutivo", desc: "Mide vencidos, bloqueados, capacidad y pedidos fuera de tiempo.", icon: BarChart3 },
            { title: "Configuración flexible", desc: "Personaliza solicitantes, procesos, prioridades y responsables.", icon: Settings },
            { title: "Trazabilidad", desc: "Mantén registro de avance, próxima acción y responsables.", icon: TrendingUp },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5]/10 to-[#8B5CF6]/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANES ──────────────────────────── */}
      <section id="planes" className="bg-secondary/30 px-4 md:px-6 py-16 md:py-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 space-y-3">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
              🎉 Precio Fundador · 50% OFF por lanzamiento
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Planes simples para equipos que necesitan orden y trazabilidad.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-card border rounded-2xl p-6 flex flex-col relative shadow-sm ${plan.color}`}
              >
                {plan.destacado && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {plan.etiqueta || "Recomendado"}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {plan.name}
                    {plan.destacado && <span className="text-amber-400">⭐</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.usuarios}</p>
                </div>
                <div className="space-y-1 mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">Desde</span>
                    <span className="text-2xl font-bold text-foreground">{plan.precio}</span>
                    <span className="text-xs text-muted-foreground">{plan.precioPeriodo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.porUsuario}</p>
                </div>
                <div className="space-y-1.5 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Implementación única</span>
                    <span className="font-semibold text-foreground">{plan.implementacion}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary mt-px shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.destacado ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs rounded-[12px]"
                  onClick={() => selectPlan(plan.name)}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          {/* ── Precio Fundador banner ── */}
          <div className="mt-10 bg-gradient-to-br from-[#4F46E5]/5 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-3">
            <p className="text-lg font-bold text-foreground">🎉 Precio Fundador</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              50% OFF por lanzamiento para los primeros clientes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Prueba Workflow Radar, compáralo y descubre una forma más simple de gestionar el trabajo de tu equipo.
            </p>
            <Button onClick={() => scrollTo("demo")} className="rounded-[14px] mt-2">
              Solicita una demo y compara <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── CRÉDITOS ────────────────────────── */}
      <section className="px-4 md:px-6 py-16 md:py-20 max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">¿Qué son los créditos de cambios?</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Los créditos permiten solicitar ajustes menores o mejoras dentro de Workflow Radar durante el mes, sin iniciar un proyecto adicional.
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Créditos</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alcance</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_TABLE.map((row, i) => (
                  <tr key={i} className={i < CREDIT_TABLE.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-5 py-3 font-medium text-foreground">{row.creditos}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Los créditos no son acumulables. Nuevos módulos, integraciones externas o cambios estructurales se cotizan por separado.
          </p>
        </div>
      </section>

      {/* ── DEMO ────────────────────────────── */}
      <section id="demo" className="bg-secondary/30 px-4 md:px-6 py-16 md:py-20 scroll-mt-16">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Solicita una demo de Workflow Radar</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Agenda una demo y revisa cómo Workflow Radar puede adaptarse a los procesos de tu equipo.
            </p>
          </div>

          {formSent ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#ECFDF5] dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">¡Gracias!</h3>
              <p className="text-sm text-muted-foreground">Te contactaremos para coordinar tu demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              {form.plan && (
                <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-lg text-center">
                  Plan seleccionado: {form.plan}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => handleFormChange("nombre", e.target.value)} placeholder="Tu nombre" className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Empresa</Label>
                  <Input value={form.empresa} onChange={(e) => handleFormChange("empresa", e.target.value)} placeholder="Nombre de tu empresa" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => handleFormChange("cargo", e.target.value)} placeholder="Tu cargo" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Correo corporativo *</Label>
                  <Input type="email" value={form.email} onChange={(e) => handleFormChange("email", e.target.value)} placeholder="tu@empresa.com" className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Teléfono</Label>
                  <Input value={form.telefono} onChange={(e) => handleFormChange("telefono", e.target.value)} placeholder="+51 999 999 999" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Cantidad aproximada de usuarios</Label>
                  <Input value={form.usuarios} onChange={(e) => handleFormChange("usuarios", e.target.value)} placeholder="Ej: 10" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Mensaje</Label>
                <Textarea value={form.mensaje} onChange={(e) => handleFormChange("mensaje", e.target.value)} placeholder="Cuéntanos sobre tu equipo y lo que necesitas..." className="mt-1" rows={3} />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" disabled={formLoading} className="w-full rounded-[14px]">
                {formLoading ? "Enviando..." : "Solicitar demo"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                También puedes{" "}
                <button type="button" onClick={() => { setForm((prev) => ({ ...prev, plan: "" })); }} className="text-primary hover:underline">
                  probar con datos de muestra
                </button>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────── */}
      <section className="px-4 md:px-6 py-16 md:py-20 max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
            Preguntas frecuentes
          </h2>
          <div className="space-y-2.5">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      <WhatsAppFloating />

      {/* ── FOOTER ──────────────────────────── */}
      <footer className="bg-secondary/40 border-t border-border px-4 md:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Workflow Radar</p>
                <p className="text-[10px] text-muted-foreground">by Design Lab</p>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Software para centralizar pedidos, asignar responsables, medir carga y dar trazabilidad a procesos internos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Producto</p>
                <button onClick={() => scrollTo("planes")} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Planes</button>
                <button onClick={() => scrollTo("demo")} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Demo</button>
                <Link to="/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Login</Link>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Empresa</p>
                <Link to="/about" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Acerca de</Link>
                <Link to="/contact" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Contacto</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center">
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} Workflow Radar by Design Lab. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}