import { useEffect, useState } from "react";
import * as statisticsService from "../services/statisticsService";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";

const LABELS = {
  PENDING: "Pendientes",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completadas",
  CANNOT_COMPLETE: "No se pudo",
  CANCELLED: "Canceladas",
  EXPIRED: "Vencidas",
};

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    statisticsService
      .getStatistics()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!stats) return null;

  const max = Math.max(1, ...Object.values(stats.counts));

  return (
    <div className="stack">
      <h1>Estadísticas</h1>
      <div className="card">
        <p className="text-muted">Total de tareas: {stats.total}</p>
      </div>
      <div className="grid-stats">
        {Object.entries(stats.counts).map(([status, count]) => (
          <div className="stat-tile" key={status}>
            <div className="stat-tile__value">{count}</div>
            <div className="stat-tile__label">{LABELS[status] ?? status}</div>
          </div>
        ))}
      </div>
      <div className="card stack">
        <h3 className="section-title">Resumen visual</h3>
        {Object.entries(stats.counts).map(([status, count]) => (
          <div key={status}>
            <div className="text-sm" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{LABELS[status] ?? status}</span>
              <span>{count}</span>
            </div>
            <div style={{ background: "var(--color-bg)", borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div
                className={`badge-${status}`}
                style={{ width: `${(count / max) * 100}%`, height: "100%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
