import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { loginSchema } from "../features/auth/authSchemas";
import ErrorAlert from "../components/ErrorAlert";

export default function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setServerError("");
    try {
      await login(values);
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error.message);
    }
  }

  function handleFieldFocus() {
    if (sessionExpired) clearSessionExpired();
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1>FamilyTask</h1>
          <p className="text-muted">Iniciá sesión para seguir con tus tareas.</p>
        </div>
        <form className="form card" onSubmit={handleSubmit(onSubmit)} noValidate>
          {sessionExpired && !serverError && (
            <div className="alert alert-info" role="status">
              Tu sesión venció. Iniciá sesión de nuevo para continuar.
            </div>
          )}
          <ErrorAlert message={serverError} />
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              onFocus={handleFieldFocus}
              {...register("email")}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <p className="text-sm" style={{ textAlign: "center", marginTop: 14 }}>
          ¿No tenés cuenta? <Link to="/register">Creá una</Link>
        </p>
      </div>
    </div>
  );
}
