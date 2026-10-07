import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import * as invitationService from "../../services/invitationService";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";
import { formatDateTimeFull } from "../../utils/format";

export default function InvitationPage() {
  const { refreshFamily } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvitations(await invitationService.listInvitations());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(token) {
    setError("");
    setActingId(token);
    try {
      await invitationService.acceptInvitation(token);
      await refreshFamily();
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(token) {
    setError("");
    setActingId(token);
    try {
      await invitationService.rejectInvitation(token);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1>Tu invitación</h1>
          <p className="text-muted">Estas son las invitaciones pendientes para tu email.</p>
        </div>
        <ErrorAlert message={error} />
        {loading ? (
          <Spinner />
        ) : invitations.length === 0 ? (
          <div className="card">
            <EmptyState>No tenés invitaciones pendientes.</EmptyState>
          </div>
        ) : (
          <div className="stack">
            {invitations.map((inv) => (
              <div className="card" key={inv.token}>
                <p>
                  Invitación para <strong>{inv.email}</strong>
                </p>
                <p className="text-sm text-muted">Vence el {formatDateTimeFull(inv.expiresAt)}</p>
                <div className="btn-group" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actingId === inv.token}
                    onClick={() => handleAccept(inv.token)}
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={actingId === inv.token}
                    onClick={() => handleReject(inv.token)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm" style={{ textAlign: "center", marginTop: 14 }}>
          ¿Preferís crear tu propia familia? <Link to="/onboarding/create-family">Crear familia</Link>
        </p>
      </div>
    </div>
  );
}
