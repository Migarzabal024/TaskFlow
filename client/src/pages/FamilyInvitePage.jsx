import { useCallback, useEffect, useState } from "react";
import * as invitationService from "../services/invitationService";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import { formatDateTimeFull } from "../utils/format";

const STATUS_LABELS = { PENDING: "Pendiente", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Vencida" };

export default function FamilyInvitePage() {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await invitationService.createInvitation(email.trim());
      setSuccess(`Invitación enviada a ${email.trim()}`);
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <h1>Invitar integrante</h1>
      <form className="form card" onSubmit={handleSubmit} noValidate>
        <ErrorAlert message={error} />
        {success && <div className="alert alert-info">{success}</div>}
        <div className="form-group">
          <label htmlFor="email">Email del integrante</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@email.com"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar invitación"}
        </button>
      </form>

      <h3 className="section-title">Invitaciones enviadas</h3>
      {loading ? (
        <Spinner />
      ) : invitations.length === 0 ? (
        <div className="card">
          <EmptyState>Todavía no enviaste invitaciones.</EmptyState>
        </div>
      ) : (
        <div className="stack">
          {invitations.map((inv) => (
            <div className="card task-row" key={inv.id}>
              <div>
                <strong>{inv.email}</strong>
                <p className="text-sm text-muted">Vence {formatDateTimeFull(inv.expiresAt)}</p>
              </div>
              <span className="badge" style={{ background: "#eef0f4" }}>
                {STATUS_LABELS[inv.status] ?? inv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
