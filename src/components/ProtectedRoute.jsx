import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, empresaActiva, isLoadingEmpresa, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || isLoadingEmpresa || !authChecked) {
    return fallback;
  }

  // ── Auth failure: redirect to landing ──────────────────
  // Always redirect to "/" so the URL matches what the user sees.
  // Pass ?expired=true when the session expired so Landing shows a message.
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // Auth required / session expired → landing with message
    window.location.href = "/?expired=true";
    return null;
  }

  if (!isAuthenticated) {
    window.location.href = "/?expired=true";
    return null;
  }

  // --- Company guard: only for Layout-wrapped routes ---
  // If authenticated but no empresa activa and not on /seleccionar-empresa,
  // redirect to company selection
  const pathname = window.location.pathname;
  if (pathname !== "/seleccionar-empresa" && !empresaActiva && !isLoadingEmpresa) {
    // Redirect to company selection
    window.location.href = "/seleccionar-empresa";
    return null;
  }

  return <Outlet />;
}