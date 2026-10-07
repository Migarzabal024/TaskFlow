const LABELS = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANNOT_COMPLETE: "No se pudo",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
