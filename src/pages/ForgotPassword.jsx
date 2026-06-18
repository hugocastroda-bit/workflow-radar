import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Workflow Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">{"Recuperar contrasena"}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Enviando..." : "Enviar enlace de recuperacion"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-center text-muted-foreground">
              {"Si el email esta registrado, recibiras un enlace para restablecer tu contrasena."}
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Volver al inicio de sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}