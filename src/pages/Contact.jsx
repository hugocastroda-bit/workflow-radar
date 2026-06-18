import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Check, Send } from "lucide-react";
import WhatsAppFloating from "@/components/WhatsAppFloating";

export default function Contact() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.DemoRequest.create({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        mensaje: form.mensaje.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Error al enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F5F7FB]/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">Workflow Radar</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">by Design Lab</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Acerca de
            </Link>
            <Link to="/contact" className="text-xs text-primary font-medium transition-colors">
              Contacto
            </Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8 text-xs rounded-[12px]">
                Inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 md:px-6 py-16 md:py-24 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Contacto
        </h1>
        <p className="text-base text-muted-foreground mb-12 max-w-xl">
          ¿Tienes preguntas sobre Workflow Radar? Escríbenos y te responderemos a la brevedad.
        </p>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Correo electrónico</p>
                <a href="mailto:contacto@radardesignlab.com" className="text-sm text-primary hover:underline">
                  contacto@radardesignlab.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ubicación</p>
                <p className="text-sm text-muted-foreground">Lima, Perú</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">WhatsApp</p>
                <a
                  href="https://wa.me/51900000000?text=Hola%2C%20quisiera%20información%20sobre%20Workflow%20Radar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  +51 900 000 000
                </a>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {sent ? (
              <div className="text-center space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">¡Mensaje enviado!</h3>
                <p className="text-sm text-muted-foreground">Te responderemos pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Nombre *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Tu nombre"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Correo electrónico *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="tu@correo.com"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Mensaje *</Label>
                  <Textarea
                    value={form.mensaje}
                    onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                    placeholder="¿En qué podemos ayudarte?"
                    className="mt-1"
                    rows={4}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full gap-1.5 rounded-[14px]">
                  {loading ? "Enviando..." : "Enviar mensaje"}
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <WhatsAppFloating />

      {/* Footer */}
      <footer className="bg-secondary/40 border-t border-border px-4 md:px-6 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            {" · "}
            <Link to="/about" className="hover:text-foreground transition-colors">Acerca de</Link>
            {" · "}
            <Link to="/contact" className="text-primary font-medium hover:underline transition-colors">Contacto</Link>
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            © {new Date().getFullYear()} Workflow Radar by Design Lab. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}