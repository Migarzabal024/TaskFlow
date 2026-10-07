import { createContext, useCallback, useEffect, useState } from "react";
import * as authService from "../../services/authService";
import * as familyService from "../../services/familyService";
import { getToken, setToken } from "../../services/apiClient";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null); // { id, name, role, ... } o null si no tiene familia
  const [loading, setLoading] = useState(true);

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
  }, []);

  const value = {
    user,
    family,
    role: family?.role ?? null,
    isLeader: family?.role === "LEADER",
    isAuthenticated: Boolean(user),
    loading,
    login,
    register,
    logout,
    refreshFamily,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
