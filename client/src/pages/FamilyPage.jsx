import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as familyService from "../services/familyService";
import Spinner from "../components/Spinner";
import ErrorAlert from "../components/ErrorAlert";

export default function FamilyPage() {
  const { family, isLeader } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    familyService
      .getMembers()
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="stack">
      <h1>{family?.name}</h1>
      <ErrorAlert message={error} />
      <div className="card">
        <p className="text-muted">
          {members.length} integrante{members.length === 1 ? "" : "s"} · tu rol:{" "}
          {isLeader ? "Líder" : "Integrante"}
        </p>
        <div className="btn-group" style={{ marginTop: 10 }}>
          <Link to="/app/family/members" className="btn btn-outline btn-sm">
            Ver integrantes
          </Link>
          {isLeader && (
            <Link to="/app/family/invite" className="btn btn-primary btn-sm">
              Invitar integrante
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
