import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Exige sesion iniciada. Si no hay token/usuario, manda a /login.
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Para /login y /register: un usuario ya autenticado no deberia volver a verlas.
export function RequireGuest() {
  const { isAuthenticated, family } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={family ? "/app/dashboard" : "/onboarding/create-family"} replace />;
  }
  return <Outlet />;
}

// Para /app/*: requiere sesion y pertenecer a una familia (el onboarding
// todavia no esta completo si no tiene familia).
export function RequireFamily() {
  const { isAuthenticated, family } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!family) return <Navigate to="/onboarding/create-family" replace />;
  return <Outlet />;
}

// Para las pantallas de onboarding: requiere sesion; si ya tiene familia no
// tiene sentido seguir onboardeando.
export function RequireOnboarding() {
  const { isAuthenticated, family } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (family) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

// UX only: oculta pantallas de LEADER a un MEMBER (el backend ya rechaza
// estas acciones de todos modos; esto evita mostrar un formulario inutil).
export function RequireLeader() {
  const { isLeader } = useAuth();
  if (!isLeader) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}
