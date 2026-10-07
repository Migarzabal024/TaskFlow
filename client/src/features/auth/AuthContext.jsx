import { createContext, useCallback, useEffect, useState } from "react";
import * as authService from "../../services/authService";
import * as familyService from "../../services/familyService";
import { getToken, setToken, SESSION_EXPIRED_EVENT } from "../../services/apiClient";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null); // { id, name, role, ... } o null si no tiene familia
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // El apiClient dispara este evento cuando un pedido autenticado recibe un
  // 401 (token vencido/invalido en otra pestaña, expiracion del JWT, etc.).
  // Centraliza el "deslogueo forzado" en un solo lugar en vez de que cada
  // pantalla lo maneje por separado (spec seccion 19: estado "unauthorized").
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setFamily(null);
      setSessionExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const refreshFamily = useCallback(async () => {
    const f = await familyService.getMyFamily();
    setFamily(f);
    return f;
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        setUser(me);
        await refreshFamily();
      } catch {
        setToken(null);
        setUser(null);
        setFamily(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [refreshFamily]);

  const login = useCallback(
    async (credentials) => {
      const { user: loggedUser, token } = await authService.login(credentials);
      setToken(token);
      setUser(loggedUser);
      setSessionExpired(false);
      await refreshFamily();
      return loggedUser;
    },
    [refreshFamily]
  );

  const register = useCallback(
    async (payload) => {
      const { user: newUser, token } = await authService.register(payload);
      setToken(token);
      setUser(newUser);
      setFamily(null);
      setSessionExpired(false);
      return newUser;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Autenticacion stateless: aunque falle la llamada, igual limpiamos localmente.
    }
    setToken(null);
    setUser(null);
    setFamily(null);
    setSessionExpired(false);
  }, []);

  const value = {
    user,
    family,
    role: family?.role ?? null,
    isLeader: family?.role === "LEADER",
    isAuthenticated: Boolean(user),
    loading,
    sessionExpired,
    clearSessionExpired: () => setSessionExpired(false),
    login,
    register,
    logout,
    refreshFamily,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
