import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const params = new URLSearchParams(window.location.search);
  const requestedNext = params.get("next")?.trim() || "";
  const safeNextUrl = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "";
  const nextUrl = safeNextUrl || "/seleccionar-empresa";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(res.access_token);
      window.location.href = nextUrl;
    } catch (err) {
      setError(err.message || "Codigo incorrecto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Workflow Radar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">by Design Lab</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          {!showOtp ? (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Contrasena</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Confirmar contrasena</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="********" className="mt-1" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full rounded-[14px]">
                  {loading ? "Registrando..." : "Registrarse"}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o</span></div>
              </div>
              <Button variant="outline" className="w-full rounded-[14px]" onClick={() => base44.auth.loginWithProvider("google", nextUrl)}>
                Continuar con Google
              </Button>
            </>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">Ingresa el codigo enviado a {email}</p>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{"Codigo de verificacion"}</Label>
                <Input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" className="mt-1" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full rounded-[14px]">
                {loading ? "Verificando..." : "Verificar"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => base44.auth.resendOtp(email)} className="w-full text-xs">
                Reenviar codigo
              </Button>
            </form>
          )}
          <p className="text-center text-xs text-muted-foreground">
            {"Ya tienes cuenta? "}<Link to={safeNextUrl ? `/login?next=${encodeURIComponent(safeNextUrl)}` : "/login"} className="text-primary hover:underline">Inicia sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}