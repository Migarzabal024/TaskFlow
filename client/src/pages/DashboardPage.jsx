import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as taskService from "../services/taskService";
import TaskListItem from "../components/TaskListItem";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { isLeader, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    taskService
      .listTasks()
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const today = todayISO();
  const active = tasks.filter((t) => !["CANCELLED"].includes(t.status));
  const todayTasks = active.filter((t) => t.dueDate === today);
  const pending = active.filter((t) => t.status === "PENDING");
  const inProgress = active.filter((t) => t.status === "IN_PROGRESS");
  const completed = active.filter((t) => t.status === "COMPLETED");
  const needsAttention = active.filter((t) => t.status === "CANNOT_COMPLETE" || t.status === "EXPIRED");

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Hola, {user?.name?.split(" ")[0]}</h1>
        {isLeader && (
          <Link to="/app/tasks/new" className="btn btn-primary">
            + Nueva tarea
          </Link>
        )}
      </div>

      <ErrorAlert message={error} />

      <div className="two-col">
        <section>
          <h3 className="section-title">
            {isLeader ? "Tareas de hoy" : "Tus tareas de hoy"} ({todayTasks.length})
          </h3>
          {todayTasks.length === 0 ? (
            <div className="card">
              <EmptyState>No hay tareas con vencimiento hoy.</EmptyState>
            </div>
          ) : (
            <div className="stack">
              {todayTasks.map((t) => (
                <TaskListItem key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>

        <div className="stack">
          {isLeader ? (
            <section className="grid-stats">
              <div className="stat-tile">
                <div className="stat-tile__value">{pending.length}</div>
                <div className="stat-tile__label">Pendientes</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__value">{inProgress.length}</div>
                <div className="stat-tile__label">En curso</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__value">{completed.length}</div>
                <div className="stat-tile__label">Completadas</div>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="section-title">
              {isLeader ? "Necesitan tu atención" : "Tareas que requieren acción"} ({needsAttention.length})
            </h3>
            {needsAttention.length === 0 ? (
              <div className="card">
                <EmptyState>Todo en orden por ahora.</EmptyState>
              </div>
            ) : (
              <div className="stack">
                {needsAttention.map((t) => (
                  <TaskListItem key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
