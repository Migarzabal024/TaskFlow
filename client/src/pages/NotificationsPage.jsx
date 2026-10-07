import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import * as notificationService from "../services/notificationService";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import { formatDateTimeFull } from "../utils/format";

const TYPE_LABELS = {
  TASK_ASSIGNED: "Te asignaron una tarea",
  TASK_REASSIGNED: "Te reasignaron una tarea",
  TASK_COMPLETED: "Una tarea fue completada",
  TASK_CANNOT_COMPLETE: "No se pudo completar una tarea",
  TASK_MESSAGE: "Nuevo mensaje en una tarea",
  TASK_EXPIRED: "Una tarea venció",
  TASK_CANCELLED: "Una tarea fue cancelada",
};

export default function NotificationsPage() {
  const outletContext = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotifications(await notificationService.listNotifications());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkRead(id) {
    try {
      await notificationService.markRead(id);
      await load();
      outletContext?.refreshUnread?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead();
      await load();
      outletContext?.refreshUnread?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Notificaciones</h1>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
            Marcar todas como leídas
          </button>
        )}
      </div>
      <ErrorAlert message={error} />
      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState>No tenés notificaciones todavía.</EmptyState>
        </div>
      ) : (
        <div className="stack">
          {notifications.map((n) => (
            <div className={`card${n.readAt ? "" : " alert-info"}`} key={n.id}>
              <div className="task-row">
                <div>
                  <strong>{TYPE_LABELS[n.type] ?? n.type}</strong>
                  {n.message && <p className="text-sm">{n.message}</p>}
                  <p className="text-sm text-muted">{formatDateTimeFull(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <button type="button" className="link-btn" onClick={() => handleMarkRead(n.id)}>
                    Marcar leída
                  </button>
                )}
              </div>
              {n.taskId && (
                <Link to={`/app/tasks/${n.taskId}`} className="text-sm">
                  Ver tarea →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
