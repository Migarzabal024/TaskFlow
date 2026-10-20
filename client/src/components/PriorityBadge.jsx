const LABELS = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" };
const ICONS = { LOW: "🌿", MEDIUM: "⚡", HIGH: "🔥" };

export default function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge-${priority}`}>
      <span aria-hidden="true">{ICONS[priority] ?? ""}</span>
      {LABELS[priority] ?? priority}
    </span>
  );
}
