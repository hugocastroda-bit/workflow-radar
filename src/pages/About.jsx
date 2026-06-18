import { Link } from "react-router-dom";
import { ArrowRight, Users, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppFloating from "@/components/WhatsAppFloating";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">Workflow Radar</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">by Design Lab</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className="text-xs text-primary font-medium transition-colors">
              Acerca de
            </Link>
            <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 md:px-6 py-16 md:py-24 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
          Acerca de Workflow Radar
        </h1>

        <div className="space-y-8 text-base text-muted-foreground leading-relaxed">
          <p>
            Workflow Radar es una plataforma web diseñada para centralizar la gestión de pedidos internos, asignar responsables y medir la carga de trabajo de equipos operativos. Nació de la necesidad de organizaciones que manejan múltiples solicitudes entre áreas —como marketing, TI, logística, operaciones o recursos humanos— y que requieren visibilidad clara sobre quién hace qué, cuándo vence cada tarea y cómo se distribuye el esfuerzo del equipo.
          </p>

          <p>
            La herramienta está pensada para líderes de equipo, coordinadores de procesos y gerentes que necesitan tomar decisiones informadas sobre capacidad y prioridades. A diferencia de soluciones genéricas de gestión de proyectos, Workflow Radar se enfoca específicamente en el flujo de pedidos internos: desde que alguien solicita algo hasta que se entrega, con trazabilidad completa en cada etapa.
          </p>

          <p>
            Workflow Radar es construido y mantenido por{" "}
            <a href="https://radardesignlab.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Design Lab
            </a>
            , un estudio de producto digital con sede en Lima, Perú. Design Lab combina diseño de producto, desarrollo de software y consultoría en procesos para crear herramientas que resuelven problemas reales de equipos en crecimiento. El equipo detrás de Workflow Radar trabaja de cerca con cada cliente durante la implementación para adaptar catálogos, flujos y configuraciones a las necesidades específicas de cada organización.
          </p>

          <p>
            Creemos que el trabajo en equipo no debería depender de cadenas interminables de correos, hojas de cálculo compartidas o mensajes dispersos en WhatsApp. Workflow Radar ofrece un espacio único donde cada pedido tiene un responsable claro, una fecha compromiso, un estado visible y una medición del esfuerzo en minutos. Esto permite a los equipos detectar sobrecarga antes de que se convierta en un problema, priorizar lo urgente y dar seguimiento sin fricción.
          </p>
        </div>

        {/* Value cards */}
        <div className="grid sm:grid-cols-3 gap-4 mt-12">
          {[
            { icon: Target, title: "Misión", desc: "Dar a los equipos una herramienta simple pero poderosa para gestionar pedidos internos con trazabilidad, medición de carga y control de capacidad." },
            { icon: Lightbulb, title: "Enfoque", desc: "Resolver el problema específico de los pedidos entre áreas, no ser una herramienta genérica de proyectos. Simple, enfocado, efectivo." },
            { icon: Users, title: "Equipo", desc: "Design Lab combina diseño, desarrollo y consultoría para crear productos que se adaptan a procesos reales de equipos latinoamericanos." },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">¿Listo para ordenar los pedidos de tu equipo?</p>
          <Link to="/">
            <Button variant="default" size="sm">
              Solicitar una demo <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </main>

      <WhatsAppFloating />

      {/* Footer */}
      <footer className="bg-secondary/40 border-t border-border px-4 md:px-6 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            {" · "}
            <Link to="/about" className="text-primary font-medium hover:underline transition-colors">Acerca de</Link>
            {" · "}
            <Link to="/contact" className="hover:text-foreground transition-colors">Contacto</Link>
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            © {new Date().getFullYear()} Workflow Radar by Design Lab. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}