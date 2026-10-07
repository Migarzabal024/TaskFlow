import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import * as familyService from "../services/familyService";
import Spinner from "../components/Spinner";
import ErrorAlert from "../components/ErrorAlert";

export default function FamilyMembersPage() {
  const { isLeader, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await familyService.getMembers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(member) {
    if (!window.confirm(`¿Quitar a ${member.name} de la familia?`)) return;
    setError("");
    setRemovingId(member.id);
    try {
      await familyService.removeMember(member.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="stack">
      <h1>Integrantes</h1>
      <ErrorAlert message={error} />
      <div className="stack">
        {members.map((m) => (
          <div className="card task-row" key={m.id}>
            <div>
              <strong>{m.name}</strong>
              {m.userId === user.id && <span className="text-muted text-sm"> (vos)</span>}
              <p className="text-sm text-muted">{m.email}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="badge" style={{ background: "#eef0f4" }}>
                {m.role === "LEADER" ? "Líder" : "Integrante"}
              </span>
              {isLeader && m.role !== "LEADER" && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={removingId === m.id}
                    onClick={() => handleRemove(m)}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
