import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/lib/ThemeContext"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';

import Bandeja from './pages/Bandeja';
import Kanban from './pages/Kanban';
import Dashboard from './pages/Dashboard';
import DetallePedido from './pages/DetallePedido';
import Configuracion from './pages/Configuracion';
import CargaMasiva from './pages/CargaMasiva';
import Archivados from './pages/Archivados';
import Diagnostico from './pages/Diagnostico';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // All auth errors are delegated to ProtectedRoute
  // Public routes (/, /login, etc.) always render regardless of auth state

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Landing />} />}>
        <Route element={<Layout />}>
          <Route path="/bandeja" element={<Bandeja />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pedido/:id" element={<DetallePedido />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/carga-masiva" element={<CargaMasiva />} />
          <Route path="/archivados" element={<Archivados />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App