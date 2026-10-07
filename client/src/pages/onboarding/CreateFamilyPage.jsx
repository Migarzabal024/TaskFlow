import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import * as familyService from "../../services/familyService";
import ErrorAlert from "../../components/ErrorAlert";

export default function CreateFamilyPage() {
  const { refreshFamily } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("El nombre de la familia debe tener al menos 2 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await familyService.createFamily(name.trim());
      await refreshFamily();
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1>Creá tu familia</h1>
          <p className="text-muted">
            Vas a ser el líder: podrás crear tareas, asignarlas e invitar al resto de la familia.
          </p>
        </div>
        <form className="form card" onSubmit={handleSubmit} noValidate>
          <ErrorAlert message={error} />
          <div className="form-group">
            <label htmlFor="name">Nombre de la familia</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Familia González"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creando..." : "Crear familia"}
          </button>
        </form>
        <p className="text-sm" style={{ textAlign: "center", marginTop: 14 }}>
          ¿Ya te invitaron a una familia? <Link to="/onboarding/invitation">Ver mi invitación</Link>
        </p>
      </div>
    </div>
  );
}
