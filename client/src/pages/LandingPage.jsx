import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LandingPage() {
  const { isAuthenticated, family } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={family ? "/app/dashboard" : "/onboarding/create-family"} replace />;
  }

  return (
    <div className="auth-screen">
      <div className="auth-card stack">
        <div className="auth-card__brand">
          <h1>FamilyTask</h1>
          <p className="text-muted">
            Organizá las tareas del hogar: asigná, hacé seguimiento, comunicate y llevá estadísticas con
            toda la familia.
          </p>
        </div>
        <div className="btn-group" style={{ flexDirection: "column" }}>
          <Link to="/login" className="btn btn-primary btn-block">
            Iniciar sesión
          </Link>
          <Link to="/register" className="btn btn-outline btn-block">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
