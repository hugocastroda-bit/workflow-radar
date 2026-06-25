import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams, hasBase44Config } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [empresaActiva, setEmpresaActivaState] = useState(null);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      if (!hasBase44Config) {
        setAppPublicSettings(null);
        setIsAuthenticated(false);
        setAuthChecked(false);
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: false // No auto-redirect — we handle errors manually below
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // Never auto-check auth here — base44.auth.me() may internally redirect
        // to login before we can catch it, skipping the landing. Defer to ProtectedRoute.
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(false); // ProtectedRoute will call checkUserAuth() when needed
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const loadEmpresaActiva = async (currentUser) => {
    setIsLoadingEmpresa(true);
    try {
      const membresias = await base44.entities.UsuarioEmpresa.filter({
        usuarioId: currentUser.id,
        estado: "Activo",
      });

      if (membresias.length === 0) {
        setEmpresaActivaState(null);
        setIsLoadingEmpresa(false);
        return { tieneEmpresas: false };
      }

      // If user already has active_empresa_id, use it
      const activeId = currentUser.active_empresa_id;
      if (activeId) {
        const activeMembership = membresias.find(m => m.empresaId === activeId);
        if (activeMembership) {
          try {
            const empresa = await base44.entities.Empresa.get(activeId);
            setEmpresaActivaState({
              empresaId: activeId,
              nombre: empresa?.nombreEmpresa || "Empresa",
              plan: empresa?.plan || "Basic",
              rol: activeMembership.rol,
              membresiaId: activeMembership.id,
            });
            setIsLoadingEmpresa(false);
            return { tieneEmpresas: true, esUnica: membresias.length === 1 };
          } catch (e) {
            // empresa not found — fall through
          }
        }
      }

      // No active empresa set or not found — user must select
      setEmpresaActivaState(null);
      setIsLoadingEmpresa(false);
      return { tieneEmpresas: true, esUnica: membresias.length === 1, necesitaSeleccion: true };
    } catch (error) {
      console.error("Error loading empresa activa:", error);
      setEmpresaActivaState(null);
      setIsLoadingEmpresa(false);
      return { tieneEmpresas: false };
    }
  };

  const setEmpresaActiva = async (empresaId, rol) => {
    try {
      const result = await base44.functions.invoke('setActiveEmpresa', { empresaId });
      const activeEmpresa = result?.data || result;
      setEmpresaActivaState(activeEmpresa || {
        empresaId,
        nombre: "Empresa",
        plan: "Basic",
        rol,
      });
      // Update user in state
      setUser(prev => prev ? { ...prev, active_empresa_id: empresaId } : prev);
    } catch (error) {
      console.error("Error setting active empresa:", error);
      throw error;
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      if (!hasBase44Config) {
        setAuthError({
          type: 'auth_required',
          message: 'Configura VITE_BASE44_APP_ID y VITE_BASE44_APP_BASE_URL para iniciar sesión.'
        });
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setEmpresaActivaState(null);
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      
      // Load active company
      await loadEmpresaActiva(currentUser);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setEmpresaActivaState(null);
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Tu sesión expiró. Inicia sesión nuevamente para continuar.'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      empresaActiva,
      isLoadingEmpresa,
      setEmpresaActiva,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
