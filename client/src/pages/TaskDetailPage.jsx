import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as taskService from "../services/taskService";
import * as familyService from "../services/familyService";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { formatDueDateTime, formatDateTimeFull } from "../utils/format";

const HISTORY_ACTION_LABELS = {
  CREATED: "creó la tarea",
  UPDATED: "editó la tarea",
  ASSIGNED: "asignó la tarea",
  REASSIGNED: "reasignó la tarea",
  STARTED: "inició la tarea",
  COMPLETED: "completó la tarea",
  CANNOT_COMPLETE: "reportó que no puede completarla",
  CANCELLED: "canceló la tarea",
  STATUS_CHANGED: "cambió el estado",
};

function memberName(members, userId) {
  if (!userId) return null;
  const member = members.find((m) => m.userId === userId);
  return member?.name ?? `Usuario #${userId}`;
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user, isLeader } = useAuth();

  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyRowId, setBusyRowId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [cannotCompleteFor, setCannotCompleteFor] = useState(null);
  const [cannotCompleteReason, setCannotCompleteReason] = useState("");
  const [reassignFor, setReassignFor] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [taskData, membersData, messagesData, historyData] = await Promise.all([
        taskService.getTask(id),
        familyService.getMembers(),
        taskService.listMessages(id).catch(() => []),
        taskService.getHistory(id).catch(() => []),
      ]);
      setTask(taskData);
      setMembers(membersData);
      setMessages(messagesData);
      setHistory(historyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshTask() {
    try {
      setTask(await taskService.getTask(id));
      setHistory(await taskService.getHistory(id).catch(() => []));
    } catch (err) {
      setError(err.message);
    }
  }

  async function runAction(rowId, action) {
    setActionError("");
    setBusyRowId(rowId);
    try {
      await action();
      await refreshTask();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyRowId(null);
    }
  }

  function isSubtaskRow(row) {
    return row.parentTaskId != null;
  }

  function changeStatus(row, status) {
    const action = isSubtaskRow(row)
      ? () => taskService.updateSubtaskStatus(task.id, row.id, status)
      : () => taskService.updateTaskStatus(row.id, status);
    return runAction(row.id, action);
  }

  function submitCannotComplete(row) {
    if (cannotCompleteReason.trim().length < 3) {
      setActionError("La razón debe tener al menos 3 caracteres");
      return;
    }
    runAction(row.id, () => taskService.cannotCompleteTask(row.id, cannotCompleteReason.trim())).then(
      () => {
        setCannotCompleteFor(null);
        setCannotCompleteReason("");
      }
    );
  }

  function submitReassign(row, assignedToId) {
    const action = isSubtaskRow(row)
      ? () => taskService.assignSubtask(task.id, row.id, Number(assignedToId))
      : () => taskService.assignTask(row.id, Number(assignedToId));
    runAction(row.id, action).then(() => setReassignFor(null));
  }

  async function handleCancelTask() {
    if (!window.confirm("¿Cancelar esta tarea? Esta acción no se puede deshacer.")) return;
    await runAction(task.id, () => taskService.cancelTask(task.id));
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setActionError("");
    try {
      const message = await taskService.sendMessage(id, messageText.trim());
      setMessages((prev) => [...prev, message]);
      setMessageText("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!task) return null;

  const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
  const canCancel = isLeader && !["COMPLETED", "CANCELLED"].includes(task.status);
  const completedSubtasks = hasSubtasks ? task.subtasks.filter((s) => s.status === "COMPLETED").length : 0;

  function renderRowActions(row) {
    const isAssignee = row.assignedToId === user.id;
    const canChangeStatus = isLeader || isAssignee;
    const canManualStatus = !isSubtaskRow(row) ? !hasSubtasks : true; // una subtarea nunca tiene sub-subtareas
    const buttons = [];

    if (canChangeStatus && canManualStatus) {
      if (row.status === "PENDING") {
        buttons.push(
          <button
            key="start"
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busyRowId === row.id}
            onClick={() => changeStatus(row, "IN_PROGRESS")}
          >
            Iniciar
          </button>
        );
      }
      if (["PENDING", "IN_PROGRESS"].includes(row.status)) {
        buttons.push(
          <button
            key="complete"
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busyRowId === row.id}
            onClick={() => changeStatus(row, "COMPLETED")}
          >
            Completar
          </button>
        );
      }
    }

    if (isAssignee && ["PENDING", "IN_PROGRESS"].includes(row.status)) {
      buttons.push(
        <button
          key="cannot"
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busyRowId === row.id}
          onClick={() => setCannotCompleteFor(row.id)}
        >
          No puedo completarla
        </button>
      );
    }

    if (isLeader && !["COMPLETED", "CANCELLED"].includes(row.status)) {
      buttons.push(
        <button
          key="reassign"
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busyRowId === row.id}
          onClick={() => setReassignFor(row.id)}
        >
          Reasignar
        </button>
      );
    }

    return (
      <div className="stack">
        {buttons.length > 0 && <div className="btn-group">{buttons}</div>}
        {cannotCompleteFor === row.id && (
          <div className="stack">
            <textarea
              rows={2}
              placeholder="¿Por qué no se puede completar?"
              value={cannotCompleteReason}
              onChange={(e) => setCannotCompleteReason(e.target.value)}
            />
            <div className="btn-group">
              <button type="button" className="btn btn-danger btn-sm" onClick={() => submitCannotComplete(row)}>
                Confirmar
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setCannotCompleteFor(null);
                  setCannotCompleteReason("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {reassignFor === row.id && (
          <div className="btn-group">
            <select defaultValue={row.assignedToId ?? ""} onChange={(e) => submitReassign(row, e.target.value)}>
              <option value="">Elegí un integrante</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setReassignFor(null)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>{task.title}</h1>
        {isLeader && (
          <div className="btn-group">
            <Link to={`/app/tasks/${task.id}/edit`} className="btn btn-outline btn-sm">
              Editar
            </Link>
            {canCancel && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleCancelTask}>
                Cancelar tarea
              </button>
            )}
          </div>
        )}
      </div>

      <ErrorAlert message={actionError} />

      <div className="card stack">
        <div className="task-row">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description && <p>{task.description}</p>}
        <p className="text-sm text-muted">📅 Vence {formatDueDateTime(task)}</p>
        {!hasSubtasks && (
          <p className="text-sm text-muted">
            👤 Asignada a {memberName(members, task.assignedToId) ?? "sin asignar"}
          </p>
        )}
        {task.status === "CANNOT_COMPLETE" && task.cannotCompleteReason && (
          <div className="alert alert-error">Motivo: {task.cannotCompleteReason}</div>
        )}
        {!hasSubtasks && renderRowActions(task)}
      </div>

      {hasSubtasks && (
        <section className="stack">
          <h3 className="section-title">
            Subtareas ({completedSubtasks}/{task.subtasks.length} completadas)
          </h3>
          {task.subtasks.map((sub) => (
            <div className="card stack" key={sub.id}>
              <div className="task-row">
                <strong>{sub.title}</strong>
                <StatusBadge status={sub.status} />
              </div>
              <p className="text-sm text-muted">👤 {memberName(members, sub.assignedToId)}</p>
              {sub.status === "CANNOT_COMPLETE" && sub.cannotCompleteReason && (
                <div className="alert alert-error">Motivo: {sub.cannotCompleteReason}</div>
              )}
              {renderRowActions(sub)}
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <h3 className="section-title">Conversación</h3>
        <div className="card stack">
          {messages.length === 0 ? (
            <EmptyState>Todavía no hay mensajes en esta tarea.</EmptyState>
          ) : (
            messages.map((m) => (
              <div className={`message-row${m.senderId === user.id ? " own" : ""}`} key={m.id}>
                <div className={`message-bubble${m.senderId === user.id ? " own" : ""}`}>
                  <div className="text-sm" style={{ fontWeight: 600 }}>
                    {memberName(members, m.senderId) ?? "Usuario"}
                  </div>
                  <div>{m.content}</div>
                </div>
                <span className="text-sm text-muted">{formatDateTimeFull(m.createdAt)}</span>
              </div>
            ))
          )}
          <form className="form" style={{ flexDirection: "row" }} onSubmit={handleSendMessage}>
            <input
              style={{ flex: 1 }}
              placeholder="Escribí un mensaje..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={sendingMessage}>
              Enviar
            </button>
          </form>
        </div>
      </section>

      <section className="stack">
        <h3 className="section-title">Historial</h3>
        <div className="card">
          {history.length === 0 ? (
            <EmptyState>Sin movimientos todavía.</EmptyState>
          ) : (
            history.map((h) => (
              <div className="history-item" key={h.id}>
                <strong>{h.userName}</strong> {HISTORY_ACTION_LABELS[h.action] ?? h.action}
                {h.previousStatus && h.newStatus ? ` (${h.previousStatus} → ${h.newStatus})` : ""}
                <div className="text-sm text-muted">{formatDateTimeFull(h.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
