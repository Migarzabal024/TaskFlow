const LABELS = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" };

export default function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{LABELS[priority] ?? priority}</span>;
}
