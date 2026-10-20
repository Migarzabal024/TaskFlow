const LABELS = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANNOT_COMPLETE: "No se pudo",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

const ICONS = {
  PENDING: "⏳",
  IN_PROGRESS: "🚀",
  COMPLETED: "🏆",
  CANNOT_COMPLETE: "⚠️",
  CANCELLED: "✖️",
  EXPIRED: "⌛",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true">{ICONS[status] ?? ""}</span>
      {LABELS[status] ?? status}
    </span>
  );
}
