import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{"Radar C&T"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Cultura y Talento</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Contrasena</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="mt-1" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Ingresando..." : "Iniciar sesion"}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => base44.auth.loginWithProvider("google", "/")}>
            Continuar con Google
          </Button>
          <div className="text-center space-y-1">
            <Link to="/forgot-password" className="text-xs text-primary hover:underline block">{"Olvidaste tu contrasena?"}</Link>
            <p className="text-xs text-muted-foreground">
              {"No tienes cuenta? "}<Link to="/register" className="text-primary hover:underline">{"Registrate"}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}