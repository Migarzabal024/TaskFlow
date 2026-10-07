import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as taskService from "../services/taskService";
import * as familyService from "../services/familyService";
import TaskListItem from "../components/TaskListItem";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";

const STATUS_OPTIONS = [
  ["", "Todos los estados"],
  ["PENDING", "Pendiente"],
  ["IN_PROGRESS", "En curso"],
  ["COMPLETED", "Completada"],
  ["CANNOT_COMPLETE", "No se pudo"],
  ["CANCELLED", "Cancelada"],
  ["EXPIRED", "Vencida"],
];

const PRIORITY_OPTIONS = [
  ["", "Toda prioridad"],
  ["LOW", "Baja"],
  ["MEDIUM", "Media"],
  ["HIGH", "Alta"],
];

export default function TasksListPage() {
  const { isLeader } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", priority: "", dueDate: "", assignedToId: "" });

  const load = useCallback(async (currentFilters) => {
    setLoading(true);
    setError("");
    try {
      setTasks(await taskService.listTasks(currentFilters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLeader) familyService.getMembers().then(setMembers).catch(() => {});
  }, [isLeader]);

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Tareas</h1>
        {isLeader && (
          <Link to="/app/tasks/new" className="btn btn-primary">
            + Nueva tarea
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={filters.priority} onChange={(e) => updateFilter("priority", e.target.value)}>
          {PRIORITY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dueDate}
          onChange={(e) => updateFilter("dueDate", e.target.value)}
        />
        {isLeader && (
          <select
            value={filters.assignedToId}
            onChange={(e) => updateFilter("assignedToId", e.target.value)}
          >
            <option value="">Todos los integrantes</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ErrorAlert message={error} />

      {loading ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <div className="card">
          <EmptyState>No hay tareas con estos filtros.</EmptyState>
        </div>
      ) : (
        <div className="stack">
          {tasks.map((t) => (
            <TaskListItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
