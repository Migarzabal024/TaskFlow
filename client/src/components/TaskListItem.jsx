import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { formatDueDateTime } from "../utils/format";

export default function TaskListItem({ task }) {
  const isComposite = Array.isArray(task.subtasks) || task.assignedToId == null;
  return (
    <Link to={`/app/tasks/${task.id}`} className="card" style={{ display: "block" }}>
      <div className="task-row">
        <div>
          <strong>{task.title}</strong>
          {task.assigneeName && <p className="text-sm text-muted">Asignada a {task.assigneeName}</p>}
          {isComposite && !task.assigneeName && <p className="text-sm text-muted">Tarea compuesta</p>}
        </div>
        <StatusBadge status={task.status} />
      </div>
      <div className="task-row__meta">
        <PriorityBadge priority={task.priority} />
        <span className="badge" style={{ background: "transparent", color: "inherit" }}>
          📅 {formatDueDateTime(task)}
        </span>
      </div>
    </Link>
  );
}
