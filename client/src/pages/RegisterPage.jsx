import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { registerSchema } from "../features/auth/authSchemas";
import ErrorAlert from "../components/ErrorAlert";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values) {
    setServerError("");
    try {
      await registerUser(values);
      navigate("/onboarding/create-family", { replace: true });
    } catch (error) {
      setServerError(error.message);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1>FamilyTask</h1>
          <p className="text-muted">Creá tu cuenta para empezar a organizar las tareas del hogar.</p>
        </div>
        <form className="form card" onSubmit={handleSubmit(onSubmit)} noValidate>
          <ErrorAlert message={serverError} />
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input id="name" autoComplete="name" {...register("name")} />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="passwordConfirmation">Confirmar contraseña</label>
            <input
              id="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              {...register("passwordConfirmation")}
            />
            {errors.passwordConfirmation && (
              <span className="field-error">{errors.passwordConfirmation.message}</span>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
        <p className="text-sm" style={{ textAlign: "center", marginTop: 14 }}>
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
}
